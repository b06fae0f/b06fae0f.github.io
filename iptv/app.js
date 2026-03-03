let starttime = performance.now();

const iptv = new IptvPlayer();
document.getElementById('main').appendChild(iptv.getRoot());

if (!localStorage.getItem('FirstTimeRun')) {
	localStorage.setItem('FirstTimeRun', 1);
	document.getElementById('settings').showModal();
}

if (window.location.search) {
	let params = new URLSearchParams(window.location.search);
	let url = params.get('url');
	iptv.loadURL(url);
}

document.querySelectorAll('dialog').forEach(d => {
	d.addEventListener('toggle', e => iptv.focused = !e.target.open);
	d.getElementsByClassName('dialog-close')[0]?.addEventListener('click', e => d.close());
});

document.settingsForm.addEventListener('submit', (e) => {
	e.preventDefault();
	switch (e.submitter.name) {
		case 'loadUrl':
			const url = e.target['url'].value.trim();
			const upd = parseInt(e.target['update']?.value) || 0;
			
			iptv.setUpdateInterval(upd).loadURL(url, () => {
				document.getElementById('settings').close();
			});
			
			break;
			
		case 'uploadFile':
			const file = e.target['file'].files[0];
			
			iptv.loadFile(file, () => {
				document.getElementById('settings').close();
			});
			
			break;
	}
});

document.getElementById('version').innerText = IptvPlayer.version;

console.log('app.js took %f ms to complete.', (performance.now() - starttime).toFixed(3));
