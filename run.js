var discordWebhook = 'https://discordapp.com/api/webhooks/717858363832008765/wKAA4IpY6qRT4nwEh8x-6x2VBN64q9IhQlbefZ6bvQeKxxor-yDysCo-_a0J5R7a1BVS';

var diceObserver = new MutationObserver(function(mutations) {
	mutations.forEach(function(mutation) {
		if (mutation.addedNodes.length) {
			var newNode = mutation.addedNodes[0];
			if (newNode.classList.contains('noty_bar')) {
				var results = {
					character: document.getElementsByClassName('ddbc-character-tidbits__name')[0].textContent,
					rollDetail: newNode.getElementsByClassName('dice_result__info__rolldetail')[0].textContent,
					rollType: newNode.getElementsByClassName('dice_result__rolltype')[0].textContent,
					infoBreakdown: newNode.getElementsByClassName('dice_result__info__breakdown')[0].textContent,
					rolledDice: newNode.getElementsByClassName('dice_result__info__dicenotation')[0].textContent,
					rolledTotal: newNode.getElementsByClassName('dice_result__total')[0].textContent
				};

				var msg = results.character + "\n" + results.rollDetail + results.rollType + "\n🎲" + results.infoBreakdown + " = " + results.rolledTotal + "\n" + results.rolledDice;

				//	var xhr = new XMLHttpRequest();
				//	xhr.open("POST", discordWebhook, true);
				//	xhr.setRequestHeader('Content-Type', 'application/json');
				//	xhr.send(JSON.stringify({
				//		content: msg
				//	}));

				console.log(msg);
			}
		}
	})
})

ensureObservation();

var popupObserver = new MutationObserver(function(mutations) {
	ensureObservation();
})

popupObserver.observe(document.body, {
	childList: true
});

function ensureObservation() {
	var dicePopup = document.getElementById('noty_layout__bottomRight');
	if (dicePopup === null) {
		dicePopup = document.createElement('div');
		dicePopup.setAttribute('id', 'noty_layout__bottomRight');
		dicePopup.setAttribute('role', 'alert');
		dicePopup.setAttribute('aria-live', 'polite');
		dicePopup.setAttribute('class', 'noty_layout uncollapse');
		document.body.appendChild(dicePopup);
		// Attach the observer
		diceObserver.observe(dicePopup, {
			childList: true
		});
	}
}