var currentLocation = [location.protocol, '//', location.host, location.pathname].join('');

// Load data and run if match is found.
chrome.storage.sync.get(['data'], function (result) {
    let data = result.data;
    data.forEach(function (item, index) {
        if (item.character === currentLocation) {
            // console.log(item);
            DnDiscord.run(item.active, item.destination);
        }
    });
});

// Listen to save event from popup and run if match is found.
chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        let data = request.data;
        data.forEach(function (item, index) {
            if (item.character === currentLocation) {
                DnDiscord.run(item.active, item.destination);
            }
        });
        return true;
    });

var DnDiscord = {
    active: false,
    destination: null,
    template: `
    <div id="dndiscord-connection-status" style="width: 100%;text-align: right;background-color: BGR; color: #fff">
        <p>This character's connection to a Discord channel is currently {status}.</p>
    </div>
    `,
    run: function (active, destination) {
        var _this = this;
        // console.log('starting run!')
        this.active = active;
        this.destination = destination;
        if (this.active && this.destination) {
            // console.log('spinning up');
            this.spinUp();
        } else {
            // console.log('tearing down')
            this.teardown();
        }
        this.showConnectionStatus();
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

                    // Do an extra check here before sending
                    if (DnDiscord.active && DnDiscord.destination) {
                        // console.log('sending to ' + DnDiscord.destination)
                        DnDiscord.sendToDiscord(results);
                    }
                    // console.log(msg);
                }
            }
        })
    }),
    popupObserver: new MutationObserver(function (mutations) {
        DnDiscord.ensureObservation();
    }),
    sendToDiscord: function (results) {
        let payload = {
            "embeds": [
                {
                    "title": results.infoBreakdown + " = ** " + results.rolledTotal + "**",
                    "url": "https://discordapp.com",
                    "color": 12127179,
                    "author": {
                        "name": results.character,
                        "url": currentLocation,
                        "icon_url": DnDiscord.getCharacterAvatar()
                    },
                    "description": results.rollDetail + results.rollType + " `[" + results.rolledDice + "]`"
                }
            ]
        }
        let xhr = new XMLHttpRequest();
        xhr.open("POST", DnDiscord.destination, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify(payload));
    },
    ensureObservation: function () {
        let dicePopup = document.getElementById('noty_layout__bottomRight');
        if (dicePopup === null) {
            dicePopup = document.createElement('div');
            dicePopup.setAttribute('id', 'noty_layout__bottomRight');
            dicePopup.setAttribute('role', 'alert');
            dicePopup.setAttribute('aria-live', 'polite');
            dicePopup.setAttribute('class', 'noty_layout uncollapse');
            document.body.appendChild(dicePopup);
        }
        // Attach the observer
        this.diceObserver.disconnect();
        this.diceObserver.observe(dicePopup, {
            childList: true
        });
    },
    teardown: function () {
        this.popupObserver.disconnect();
        this.diceObserver.disconnect();
    },
    spinUp: function () {
        this.ensureObservation();
        this.popupObserver.observe(document.body, {
            childList: true
        });
    },
    showConnectionStatus: function () {
        let connectionStatusElement = document.getElementById('dndiscord-connection-status');
        if (connectionStatusElement !== null) {
            connectionStatusElement.parentNode.removeChild(connectionStatusElement);
        }
        connectionStatusElement = this.createConnectionStatusHtmlElement();
        document.getElementsByClassName('ct-character-sheet__inner')[0].appendChild(connectionStatusElement);
        // console.log('writing connection status');
    },
    createConnectionStatusHtmlElement: function () {
        let e = document.createElement('template');
        let html = this.template.trim();
        html = html.replace(/{status}/g, this.active ? 'active' : 'inactive');
        html = html.replace('BGR', this.active ? '#1B9AF0' : '#FF0000');
        e.innerHTML = html;
        return e.content.firstChild;
    },
    getCharacterAvatar: function () {
        let img = document.getElementsByClassName('ddbc-character-tidbits__avatar')[0];
        let style = img.currentStyle || window.getComputedStyle(img, false);
        return style.backgroundImage.slice(4, -1).replace(/"/g, "");
    }
}
