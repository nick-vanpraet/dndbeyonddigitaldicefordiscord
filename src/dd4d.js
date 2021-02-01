var currentLocation = [location.protocol, '//', location.host, location.pathname].join('');

// Load data and run if match is found.
chrome.storage.sync.get(['characters'], function(result) {
    let data = result.characters;
    for (const property in data) {
        if (data[property].character === currentLocation) {
            DD4D.run(data[property].active, data[property].destination);
        }
    }
});

// Listen to storage change, run if match is found.
chrome.storage.onChanged.addListener(function(changes, namespace) {
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
    function(request, sender, sendResponse) {
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
        <p>DD4D connection to Discord channel is currently {status}.</p>
    </div>
    `,
    run: function(active, destination) {
        this.active = active;
        this.destination = destination;
        if (this.active && this.destination) {
            this.spinUp();
        } else {
            this.teardown();
        }
        this.showConnectionStatus();
    },
    getNodeTextContentByClassName: function(node, className, defaultValue = false) {
        let target = node.getElementsByClassName(className);
        console.log(target);
        if (target.length > 0) {
            return target[0].textContent
        }
        return defaultValue;
    },
    getNodeTextContentByClassStartsWith: function(node, classStartsWith, defaultValue = false) {
        let target = node.querySelector('[class^="'+classStartsWith+'"],[class*=" '+classStartsWith+'"]');
        if (target) {
            return target.textContent
        }
        return defaultValue;
    },
    diceObserver: new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length) {
                let newNode = mutation.addedNodes[0];
                if (newNode.classList.contains('noty_bar')) {
                    let results = {
                        character: DD4D.getNodeTextContentByClassName(document, 'ddbc-character-name'),
                        rollDetail: DD4D.getNodeTextContentByClassName(newNode, 'dice_result__info__rolldetail'),
                        rollType: DD4D.getNodeTextContentByClassName(newNode, 'dice_result__rolltype'),
                        infoBreakdown: DD4D.getNodeTextContentByClassName(newNode, 'dice_result__info__breakdown'),
                        rolledDice: DD4D.getNodeTextContentByClassName(newNode, 'dice_result__info__dicenotation'),
                        rolledTotal: DD4D.getNodeTextContentByClassName(newNode, 'dice_result__total-result'),
                        advantage: DD4D.getNodeTextContentByClassName(newNode, 'dice_result__total-header--advantage'),
                        disadvantage: DD4D.getNodeTextContentByClassName(newNode, 'dice_result__total-header--disadvantage'),
                        crit: DD4D.getNodeTextContentByClassName(newNode, 'dice_result__total-header--crit'),
                        avatar: DD4D.getCharacterAvatar(),
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
    containsStartsWith: function(list, startsWith) {
        list.forEach(function (value) {
            if (value.startsWith(startsWith)) {
                return true;
            }
        });
        return false;
    },
    campaignGameLogObserver: new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length) {
                let newNode = mutation.addedNodes[0];
                if (newNode.tagName == 'LI') {
                    let infoBreakdown = DD4D.getNodeTextContentByClassStartsWith(newNode, "DiceMessage_Number");
                    if (infoBreakdown && infoBreakdown.indexOf('?') === -1) {
                        console.log(infoBreakdown);
                        let results = {
                            character: DD4D.getNodeTextContentByClassStartsWith(newNode, 'GameLogEntry_Sender'),
                            rollDetail: DD4D.getNodeTextContentByClassStartsWith(newNode, "DiceMessage_Action"),
                            rollType: DD4D.getNodeTextContentByClassStartsWith(newNode, 'DiceMessage_RollType'),
                            infoBreakdown: DD4D.getNodeTextContentByClassStartsWith(newNode, 'DiceMessage_Number'),
                            rolledDice: DD4D.getNodeTextContentByClassStartsWith(newNode, 'DiceMessage_Notation'),
                            rolledTotal: DD4D.getNodeTextContentByClassStartsWith(newNode, 'DiceMessage_Total'),
                            advantage:DD4D.getNodeTextContentByClassStartsWith(newNode, 'DiceMessage_TotalHeader__advantage'),
                            disadvantage: DD4D.getNodeTextContentByClassStartsWith(newNode, 'DiceMessage_TotalHeader__disadvantage'),
                            crit: false, // Currently it doesn't look like the game logs shows anything for this
                            avatar: DD4D.getGameLogAvatar(newNode)
                        };
                        // let msg = results.character + "\n" + results.rollDetail + results.rollType + "\n🎲" + results.infoBreakdown + " = " + results.rolledTotal + "\n" + results.rolledDice;
                        // Do an extra check here before sending
                        if (DD4D.active && DD4D.destination) {
                            DD4D.sendToDiscord(results);
                        }
                    }
                }
            }
        })
    }),
    popupObserver: new MutationObserver(function(mutations) {
        DD4D.ensureObservation();
    }),
    getMinMaxDiceRollPair: function(string) {
        let regex = /\((\d+),(\d+)\)(.*)/;
        let pair = {
            rest: ''
        };
        let matches = string.match(regex);

        if ((1 in matches) && (2 in matches)) {
            pair.min = matches[1];
            pair.max = matches[2];
            if (parseInt(matches[1]) > parseInt(matches[2])) {
                pair.max = matches[1];
                pair.min = matches[2];
            }
        }
        if (3 in matches) {
            pair.rest = matches[3]
        }
        return pair;
    },
    sendToDiscord: function(results) {
        let description = results.rollDetail + results.rollType + " `[" + results.rolledDice + "]`";
        let color = 12127179
        let title = results.infoBreakdown + " = ** " + results.rolledTotal + "**";
        let author = results.character + " rolls"

        if (results.advantage) {
            author += " with advantage"
            minMaxPair = DD4D.getMinMaxDiceRollPair(results.infoBreakdown)
            title = '(~~' + minMaxPair.min + '~~,**' + minMaxPair.max + '**)' + minMaxPair.rest + " = ** " + results.rolledTotal + "**";
            //color = 584507
        }
        if (results.disadvantage) {
            author += " with disadvantage"
            minMaxPair = DD4D.getMinMaxDiceRollPair(results.infoBreakdown)
            title = '(**' + minMaxPair.min + '**,~~' + minMaxPair.max + '~~)' + minMaxPair.rest + " = ** " + results.rolledTotal + "**";
            //color = 15403044
        }
        if (results.crit) {
            author += " for a critical hit"
        }
        author += "!"

        let payload = {
            "embeds": [{
                "title": title,
                "url": "https://discordapp.com",
                "color": color,
                "author": {
                    "name": author,
                    "url": currentLocation
                },
                "thumbnail": {
                    "url": results.avatar
                },
                "fields": [{
                    "name": "Type",
                    "value": results.rollDetail + results.rollType,
                    "inline": true
                }, {
                    "name": "Dice",
                    "value": "`[" + results.rolledDice + "]`",
                    "inline": true
                }],
            }]
        }
        let xhr = new XMLHttpRequest();
        xhr.open("POST", DD4D.destination, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify(payload));
    },
    ensureObservation: function() {
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

        let campaignGameLog = document.querySelector('.sidebar__inner');
        if (campaignGameLog === null || typeof campaignGameLog === 'undefined') {
            campaignGameLog = document.createElement('div');
            campaignGameLog.setAttribute('class', 'sidebar__inner');
            document.body.appendChild(campaignGameLog);
        }
        // Attach the observer
        this.campaignGameLogObserver.disconnect();
        this.campaignGameLogObserver.observe(campaignGameLog, {subtree: true, childList: true});
    },
    teardown: function() {
        this.popupObserver.disconnect();
        this.diceObserver.disconnect();
        this.campaignGameLogObserver.disconnect();
    },
    spinUp: function() {
        this.ensureObservation();
        this.popupObserver.observe(document.body, {
            childList: true
        });
    },
    hideConnectionStatus: function() {
        let connectionStatusElement = document.getElementById('dd4d-connection-status');
        if (connectionStatusElement !== null) {
            connectionStatusElement.parentNode.removeChild(connectionStatusElement);
        }
    },
    showConnectionStatus: function() {
        this.hideConnectionStatus();
        let connectionStatusElement = this.createConnectionStatusHtmlElement();
        let target = document.getElementsByClassName('ct-character-sheet__inner')[0];
        if (target === null | typeof target == 'undefined') {
            target = document.getElementsByClassName('ddb-campaigns-detail-header')[0];
        }
        target.appendChild(connectionStatusElement);
    },
    createConnectionStatusHtmlElement: function() {
        let e = document.createElement('template');
        let html = this.template.trim();
        html = html.replace(/{status}/g, this.active ? 'active' : 'inactive');
        html = html.replace('BGR', this.active ? '#1B9AF0' : '#FF0000');
        e.innerHTML = DOMPurify.sanitize(html);
        return e.content.firstChild;
    },
    getCharacterAvatar: function() {
        let img = document.getElementsByClassName('ddbc-character-avatar__portrait')[0];
        let style = img.currentStyle || window.getComputedStyle(img, false);
        return style.backgroundImage.slice(4, -1).replace(/"/g, "");
    },
    getGameLogAvatar: function(node) {
        let img = node.querySelector('img[class^="Avatar_AvatarPortrait"],[class*=" Avatar_AvatarPortrait"]');
        if (img) {
            return img.src;
        }
    }
}
