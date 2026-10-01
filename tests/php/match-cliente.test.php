<?php
// Rodar: C:\xampp\php\php.exe tests/php/match-cliente.test.php
require __DIR__ . '/../../api/match-cliente.php';

$F = json_decode(file_get_contents(__DIR__ . '/../fixtures/match-cliente.json'), true);
$falhas = 0;
$total = 0;

function check($ok, $desc) {
    global $falhas, $total;
    $total++;
    if (!$ok) {
        $falhas++;
        echo "FALHOU: {$desc}\n";
    }
}

foreach ($F['normalizar'] as $c) {
    $r = mc_normalizar_nome($c['in']);
    check($r === $c['out'], "normalizar " . json_encode($c['in']) . " => {$r}");
}
foreach ($F['nomesDoCard'] as $c) {
    $r = mc_nomes_do_card($c['card']);
    check($r === $c['out'], "nomesDoCard " . json_encode($r, JSON_UNESCAPED_UNICODE));
}
foreach ($F['match'] as $c) {
    $r = mc_match_cliente($c['cliente'], $c['card']);
    $via = $r ? $r['via'] : null;
    check($via === $c['via'], "match {$c['desc']} => " . json_encode($via));
}
foreach ($F['encontrar'] as $c) {
    $ids = array_map(function ($x) { return $x['id']; }, mc_encontrar_cards($c['cliente'], $c['cards']));
    check($ids === $c['ids'], "encontrar {$c['desc']} => " . json_encode($ids));
}
foreach ($F['preenchido'] as $c) {
    check(mc_card_preenchido($c['card']) === $c['out'], "preenchido " . json_encode($c['card']));
}
foreach ($F['colunaRazao'] as $c) {
    check(mc_indice_coluna_razao($c['headers']) === $c['razao'], "colunaRazao " . implode('|', $c['headers']));
    check(mc_indice_coluna_cnpj($c['headers']) === $c['cnpj'], "colunaCnpj " . implode('|', $c['headers']));
}

echo ($total - $falhas) . "/{$total} OK\n";
exit($falhas ? 1 : 0);
