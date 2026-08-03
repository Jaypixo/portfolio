(function () {
	var stored = localStorage.getItem('theme');
	var theme = stored || 'dark';
	document.documentElement.setAttribute('data-theme', theme);

	document.addEventListener('DOMContentLoaded', function () {
		var btn = document.querySelector('.theme-toggle');
		if (!btn) return;
		btn.textContent = theme === 'light' ? '☾' : '☀';
		btn.addEventListener('click', function () {
			theme = theme === 'light' ? 'dark' : 'light';
			document.documentElement.setAttribute('data-theme', theme);
			localStorage.setItem('theme', theme);
			btn.textContent = theme === 'light' ? '☾' : '☀';
		});
	});
})();
