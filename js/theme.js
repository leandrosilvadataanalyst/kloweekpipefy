(function () {
    'use strict';

    function applyIcons() {
        var dark = document.documentElement.classList.contains('dark');
        var sun = document.getElementById('icon-sun');
        var moon = document.getElementById('icon-moon');
        if (sun) sun.classList.toggle('hidden', !dark);
        if (moon) moon.classList.toggle('hidden', dark);
    }

    function bindSidebar() {
        var btnMenu = document.getElementById('btn-menu');
        var sidebar = document.getElementById('sidebar');
        var backdrop = document.getElementById('backdrop');
        var close = function () {
            if (sidebar) sidebar.classList.add('-translate-x-full');
            if (backdrop) backdrop.classList.add('hidden');
        };
        if (btnMenu && sidebar) {
            btnMenu.addEventListener('click', function () {
                var isOpen = !sidebar.classList.contains('-translate-x-full');
                if (isOpen) {
                    close();
                } else {
                    sidebar.classList.remove('-translate-x-full');
                    if (backdrop) backdrop.classList.remove('hidden');
                }
            });
        }
        if (backdrop) backdrop.addEventListener('click', close);
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') close();
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        applyIcons();
        var btn = document.getElementById('btn-theme');
        if (btn) {
            btn.addEventListener('click', function () {
                var isDark = document.documentElement.classList.contains('dark');
                var nextDark = !isDark;
                document.documentElement.classList.toggle('dark', nextDark);
                try {
                    localStorage.setItem('kloweek-theme', nextDark ? 'dark' : 'light');
                } catch (e) {}
                applyIcons();
                window.dispatchEvent(new CustomEvent('theme-changed', { detail: { dark: nextDark } }));
            });
        }
        bindSidebar();
    });
})();