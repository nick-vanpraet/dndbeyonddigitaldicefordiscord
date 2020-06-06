var currentLocation = [location.protocol, '//', location.host, location.pathname].join('');

// Load data and run if match is found.
chrome.storage.sync.get(['characters'], function (result) {
    let data = result.characters;
    for (const property in data) {
        if (data[property].character === currentLocation) {
            DD4D.run(data[property].active, data[property].destination);
        }
    }
});

// Listen to storage change, run if match is found.
chrome.storage.onChanged.addListener(function (changes, namespace) {
    if (namespace !== 'sync') {
        // Ignore localstorage changes.
    }
    if (changes.characters) {
        let original = {};
        for (const property in changes.characters.oldValue) {
            if (changes.characters.oldValue[property].character === currentLocation) {
                original = changes.characters.oldValue[property];
            }
        }
        let updated = {};
        for (const property in changes.characters.newValue) {
            if (changes.characters.newValue[property].character === currentLocation) {
                updated = changes.characters.newValue[property];
            }
        }
        // Remove name, doesn't matter.
        delete original.name;
        delete updated.name;

        if (JSON.stringify(original) === JSON.stringify(updated)) {
            // Nothing has changed, so there's no reason to rerun anything.
        } else {
            // Something has changed!
            if (!isEmpty(original) && isEmpty(updated)) {
                DD4D.teardown();
                DD4D.hideConnectionStatus();
            }
            if (isEmpty(original) && !isEmpty(updated)) {
                DD4D.run(updated.active, updated.destination)
            }
            if (!isEmpty(original) && !isEmpty(updated)) {
                DD4D.run(updated.active, updated.destination)
            }
        }
    }
});

function isEmpty(obj) {
    for (let prop in obj) {
        if (obj.hasOwnProperty(prop)) {
            return false;
        }
    }
    return JSON.stringify(obj) === JSON.stringify({});
}

// Listen to save event from settings and run if match is found.
chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        let data = request.characters;
        for (const property in data) {
            if (data[property].character === currentLocation) {
                DD4D.run(data[property].active, data[property].destination);
            }
        }
        return true;
    });

var DD4D = {
    active: false,
    destination: null,
    template: `
    <div id="dd4d-connection-status" style="width: 100%;text-align: right;background-color: BGR; color: #fff">
        <p>This character's connection to a Discord channel is currently {status}.</p>
    </div>
    `,
    run: function (active, destination) {
        this.active = active;
        this.destination = destination;
        if (this.active && this.destination) {
            this.spinUp();
        } else {
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

                    // let msg = results.character + "\n" + results.rollDetail + results.rollType + "\n🎲" + results.infoBreakdown + " = " + results.rolledTotal + "\n" + results.rolledDice;
                    // Do an extra check here before sending
                    if (DD4D.active && DD4D.destination) {
                        DD4D.sendToDiscord(results);
                    }
                }
            }
        })
    }),
    popupObserver: new MutationObserver(function (mutations) {
        DD4D.ensureObservation();
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
                        "icon_url": DD4D.getCharacterAvatar()
                    },
                    "description": results.rollDetail + results.rollType + " `[" + results.rolledDice + "]`"
                }
            ]
        }
        let xhr = new XMLHttpRequest();
        xhr.open("POST", DD4D.destination, true);
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
    hideConnectionStatus: function () {
        let connectionStatusElement = document.getElementById('dd4d-connection-status');
        if (connectionStatusElement !== null) {
            connectionStatusElement.parentNode.removeChild(connectionStatusElement);
        }
    },
    showConnectionStatus: function () {
        this.hideConnectionStatus();
        let connectionStatusElement = this.createConnectionStatusHtmlElement();
        document.getElementsByClassName('ct-character-sheet__inner')[0].appendChild(connectionStatusElement);
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
