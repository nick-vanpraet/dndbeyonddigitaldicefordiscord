	document.addEventListener('DOMContentLoaded', function() {
		var checkPageButton = document.getElementById('connect');
		checkPageButton.addEventListener('click', function() {

			chrome.tabs.executeScript({
				file: 'run.js'
			});


		}, false);
	}, false);