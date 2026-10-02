<?php
/**
 * Fonte única (PHP) do cruzamento cliente (cockpit) × card do ROI Week (Pipefy).
 * Espelho de js/utils/match-cliente.js — mudanças devem ir para os dois
 * e para tests/fixtures/match-cliente.json (testes de paridade JS/PHP).
 *
 * Níveis: 1 razao_social · 2 nome · 3 prefixo · 4 contido (ver o arquivo JS).
 */

const MC_STOPWORDS = ['LTDA', 'EIRELI', 'ME', 'EPP', 'SA', 'MEI', 'CIA', 'COMERCIO', 'DE', 'DA', 'DO', 'DOS', 'DAS', 'E'];

const MC_ACENTOS = [
    'á'=>'a','à'=>'a','â'=>'a','ã'=>'a','ä'=>'a','å'=>'a','ç'=>'c','é'=>'e','è'=>'e','ê'=>'e','ë'=>'e',
    'í'=>'i','ì'=>'i','î'=>'i','ï'=>'i','ñ'=>'n','ó'=>'o','ò'=>'o','ô'=>'o','õ'=>'o','ö'=>'o',
    'ú'=>'u','ù'=>'u','û'=>'u','ü'=>'u','ý'=>'y','ÿ'=>'y',
    'Á'=>'A','À'=>'A','Â'=>'A','Ã'=>'A','Ä'=>'A','Å'=>'A','Ç'=>'C','É'=>'E','È'=>'E','Ê'=>'E','Ë'=>'E',
    'Í'=>'I','Ì'=>'I','Î'=>'I','Ï'=>'I','Ñ'=>'N','Ó'=>'O','Ò'=>'O','Ô'=>'O','Õ'=>'O','Ö'=>'O',
    'Ú'=>'U','Ù'=>'U','Û'=>'U','Ü'=>'U','Ý'=>'Y',
];

function mc_sem_acento($s) {
    return strtr((string)$s, MC_ACENTOS);
}

function mc_normalizar_nome($valor) {
    if ($valor === null) return '';
    $s = mc_sem_acento($valor);
    $s = preg_replace('/\[[^\]]*\]/u', ' ', $s);      // tags do cockpit: [IS], [PDV]...
    $s = preg_replace('/\(\d[^)]*\)/u', ' ', $s);     // datas entre parênteses
    $s = strtoupper($s);
    $s = preg_replace('/[^A-Z0-9]+/', ' ', $s);
    $s = preg_replace('/\b(S A|S S)\b/', ' ', $s);    // S/A, S.A, S/S
    $tokens = array_filter(explode(' ', $s), function ($w) {
        return $w !== '' && !in_array($w, MC_STOPWORDS, true);
    });
    return implode(' ', $tokens);
}

function mc_singular($nome) {
    return implode(' ', array_map(function ($w) {
        if (strlen($w) <= 3) return $w;
        return preg_replace('/S$/', '', preg_replace('/AIS$/', 'AL', $w));
    }, explode(' ', $nome)));
}

function mc_lista_projeto($projeto) {
    if (!$projeto) return [];
    if (is_array($projeto)) return $projeto;
    $s = trim((string)$projeto);
    if (strpos($s, '[') === 0) {
        $arr = json_decode($s, true);
        if (is_array($arr)) return $arr;
    }
    return [$s];
}

function mc_nomes_do_card($card) {
    if (!$card) return [];
    $nomes = array_merge([$card['cliente_nome'] ?? ''], mc_lista_projeto($card['projeto'] ?? ''));
    $out = [];
    foreach ($nomes as $n) {
        $norm = mc_normalizar_nome($n);
        if ($norm !== '' && !in_array($norm, $out, true)) $out[] = $norm;
    }
    return $out;
}

function mc_iguais($a, $b) {
    return $a === $b || str_replace(' ', '', $a) === str_replace(' ', '', $b);
}

function mc_eh_prefixo($a, $b) {
    $ta = explode(' ', mc_singular($a));
    $tb = explode(' ', mc_singular($b));
    list($curto, $longo) = count($ta) <= count($tb) ? [$ta, $tb] : [$tb, $ta];
    if (strlen(implode('', $curto)) < 4) return false;
    foreach ($curto as $i => $w) {
        if (($longo[$i] ?? null) !== $w) return false;
    }
    return true;
}

function mc_eh_contido($a, $b) {
    list($curto, $longo) = count(explode(' ', $a)) <= count(explode(' ', $b)) ? [$a, $b] : [$b, $a];
    return count(explode(' ', $curto)) >= 2 && strpos(" {$longo} ", " {$curto} ") !== false;
}

function mc_algum($variantes, $nomesCard, $fn) {
    foreach ($variantes as $v) {
        foreach ($nomesCard as $n) {
            if ($fn($v, $n)) return true;
        }
    }
    return false;
}

/** Vários nomes na coluna de razão social: " / " (com espaços; preserva S/A), ";" e "|". */
function mc_razoes_do_cliente($cliente) {
    $bruto = (string)($cliente['razaoSocial'] ?? ($cliente['razao_social'] ?? ''));
    $out = [];
    foreach (preg_split('/\s+\/\s+|[;|]/u', $bruto) as $parte) {
        $n = mc_normalizar_nome($parte);
        if ($n !== '' && !in_array($n, $out, true)) $out[] = $n;
    }
    return $out;
}

function mc_match_cliente($cliente, $card) {
    $nomesCard = mc_nomes_do_card($card);
    if (!$cliente || !$nomesCard) return null;
    $razoes = mc_razoes_do_cliente($cliente);
    $nome = mc_normalizar_nome($cliente['nome'] ?? '');
    $variantes = array_values(array_filter(array_merge([$nome], $razoes)));

    if ($razoes && mc_algum($razoes, $nomesCard, 'mc_iguais')) return ['via' => 'razao_social', 'nivel' => 1];
    if (mc_algum($variantes, $nomesCard, function ($v, $n) { return mc_iguais($v, $n) || mc_singular($v) === mc_singular($n); })) {
        return ['via' => 'nome', 'nivel' => 2];
    }
    if (mc_algum($variantes, $nomesCard, 'mc_eh_prefixo')) return ['via' => 'prefixo', 'nivel' => 3];
    if (mc_algum($variantes, $nomesCard, 'mc_eh_contido')) return ['via' => 'contido', 'nivel' => 4];
    return null;
}

/** Cards do cliente no nível mais confiável encontrado, na ordem original. */
function mc_encontrar_cards($cliente, $cards) {
    $comMatch = [];
    foreach ($cards ?: [] as $card) {
        $m = mc_match_cliente($cliente, $card);
        if ($m) $comMatch[] = ['card' => $card, 'nivel' => $m['nivel']];
    }
    if (!$comMatch) return [];
    $melhor = min(array_column($comMatch, 'nivel'));
    $out = [];
    foreach ($comMatch as $x) {
        if ($x['nivel'] === $melhor) $out[] = $x['card'];
    }
    return $out;
}

/** Card enviado no período = preenchido, mesmo zerado (projeto em Implementação ainda sem mídia). */
function mc_card_preenchido($card) {
    return $card !== null;
}

/** Só para médias: card com algum valor > 0. */
function mc_card_com_valores($card) {
    if (!$card) return false;
    foreach (['investimento', 'faturamento', 'mc', 'vendas'] as $k) {
        if (floatval($card[$k] ?? 0) > 0) return true;
    }
    return false;
}

function mc_header_norm($h) {
    return trim(strtoupper(mc_sem_acento($h ?? '')));
}

/** "Razão Social/Nome card Pipefy" (Wall Street/Romans/Legacy) e "Projeto no Pipefy/Razão Social" (Monsters S/A) */
function mc_indice_coluna_razao($headers) {
    foreach ($headers ?: [] as $i => $h) {
        $n = mc_header_norm($h);
        if (strpos($n, 'RAZAO SOCIAL') !== false) return $i;
        if (strpos($n, 'PIPEFY') !== false && (strpos($n, 'CARD') !== false || strpos($n, 'PROJETO') !== false)) return $i;
    }
    return -1;
}

function mc_indice_coluna_cnpj($headers) {
    foreach ($headers ?: [] as $i => $h) {
        if (strpos(mc_header_norm($h), 'CNPJ') === 0) return $i;
    }
    return -1;
}
