/*
todo: form to enter webhook
auto load? and then a button to say connect or disconnect from discord + status on the page itself
if we autoload only on character sheets that have been connected/disconnected
gotta save the connect/disconnect somewhere. disconnect = destroy all observers? connect is set up.


*/

console.log();

chrome.storage.sync.get(['data'], function (result) {
    let data = result.data;
    data.forEach(function (item, index) {
        if (item.character === window.location.href) {
            DnDiscord.run(item.active, item.destination);
        }
    });
});


chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        let data = request.data;
        data.forEach(function (item, index) {
            if (item.character === window.location.href) {
                DnDiscord.run(item.active, item.destination);
            }
        });
        return true;
    });

document.addEventListener('visibilitychange', function() {
    chrome.storage.sync.get(['data'], function (result) {
        let data = result.data;
        data.forEach(function (item, index) {
            if (item.character === window.location.href) {
                DnDiscord.run(item.active, item.destination);
            }
        });
    });
})


var DnDiscord = {
    active: false,
    destination: null,
    run: function (active) {
        var _this = this;
        console.log('starting run!')
        this.active = active;
        this.destination = window.location.href;
        if (this.active && this.destination && document.visibilityState == 'visible') {
            console.log('spinning up');
            this.spinUp();
        } else {
            console.log('tearing down')
            this.teardown();
        }
    },
    diceObserver: new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            if (mutation.addedNodes.length) {
                let newNode = mutation.addedNodes[0];
                if (newNode.classList.contains('noty_bar')) {
                    let results = {
                        character: document.getElementsByClassName('ddbc-character-tidbits__name')[0].textContent,
                        rollDetail: newNode.getElementsByClassName('dice_result__info__rolldetail')[0].textContent,
                        rollType: newNode.getElementsByClassName('dice_result__rolltype')[0].textContent,
                        infoBreakdown: newNode.getElementsByClassName('dice_result__info__breakdown')[0].textContent,
                        rolledDice: newNode.getElementsByClassName('dice_result__info__dicenotation')[0].textContent,
                        rolledTotal: newNode.getElementsByClassName('dice_result__total')[0].textContent
                    };

                    let msg = results.character + "\n" + results.rollDetail + results.rollType + "\n🎲" + results.infoBreakdown + " = " + results.rolledTotal + "\n" + results.rolledDice;

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
    }),
    popupObserver: new MutationObserver(function (mutations) {
        DnDiscord.ensureObservation();
    }),
    ensureObservation: function ensureObservation() {
        let dicePopup = document.getElementById('noty_layout__bottomRight');
        if (dicePopup === null) {
            dicePopup = document.createElement('div');
            dicePopup.setAttribute('id', 'noty_layout__bottomRight');
            dicePopup.setAttribute('role', 'alert');
            dicePopup.setAttribute('aria-live', 'polite');
            dicePopup.setAttribute('class', 'noty_layout uncollapse');
            document.body.appendChild(dicePopup);
            // Attach the observer
            this.diceObserver.observe(dicePopup, {
                childList: true
            });
        }
    },
    teardown: function () {
        this.popupObserver.disconnect();
        this.diceObserver.disconnect();
        let dicePopup = document.getElementById('noty_layout__bottomRight');
        dicePopup.parentNode.removeChild(dicePopup);
    },
    spinUp: function () {
        this.ensureObservation();
        this.popupObserver.observe(document.body, {
            childList: true
        });
    }
}



