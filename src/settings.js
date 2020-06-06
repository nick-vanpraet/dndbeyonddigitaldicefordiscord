var counter = 0;

// Don't allow query parameters or fragments so our background.js
// can always detect the presence of this tab when requested.
const validPath = window.location.protocol + '//' + window.location.host + window.location.pathname;
if (window.location.href !== validPath) {
    window.location.replace(validPath);
}

var template = `
	<section id="character-{index}" data-counter="{index}">
		<fieldset>
			<label for="active">Active</label>
		  	<input type="checkbox" class="active" name="active-{index}" data-replace-check>
		</fieldset>
			<fieldset>
			<label for="character_name-{index}">Name</label>
		  	<input type="text" class="active" name="character_name-{index}" data-replace-name size="10">
		</fieldset>
		<fieldset>
		 	<label for="character_page-{index}">DnDBeyond Character Sheet URL</label>
		  	<input type="url" class="character-page" name="character_page-{index}" placeholder="https://dndbeyond..." required data-replace-char>
		</fieldset>
		<fieldset>
		 	<label for="destination_url-{index}">Discord Webhook</label>
		  	<input type="url" class="destination-url" name="destination_url-{index}" placeholder="https://discordapp..." required data-replace-url>
		</fieldset>
		<fieldset>
			<input type="button" class="remove-character" value="Remove"/>
		</fieldset>
	</section>
`


function htmlToElement(html, i, data = {}) {
    let e = document.createElement('template');
    html = html.trim();
    html = html.replace(/{index}/g, i)

    if (data.character) {
        html = html.replace('data-replace-char', 'value="' + data.character + '"')
    }
    if (data.destination) {
        html = html.replace('data-replace-url', 'value="' + data.destination + '"')
    }
    if (data.active) {
        html = html.replace('data-replace-check', 'checked')
    }
    if (data.name) {
        html = html.replace('data-replace-name', 'value="' + data.name + '"')
    }

    e.innerHTML = html;
    return e.content.firstChild;
}


function processFormSubmit(e) {
    if (e.submitter.value !== 'Save') {
        return;
    }
    let form = document.getElementById('characterform');
    let results = [];

    let sections = form.getElementsByTagName('section');
    for (var i = 0; i < sections.length; i++) {
        let section = sections.item(i);
        let counter = section.dataset.counter;

        let character = section.querySelector('[name="character_page-' + counter + '"]').value;
        let destination = section.querySelector('[name="destination_url-' + counter + '"]').value;
        let active = section.querySelector('[name="active-' + counter + '"]').checked;
        let name = section.querySelector('[name="character_name-' + counter + '"]').value;

        let submitted = {
            character: character,
            destination: destination,
            active: active,
            name: name
        }
        results.push(submitted)
    }

    chrome.storage.sync.set({
        data: results
    }, function () {

        // Set show message
        chrome.storage.local.set({
            message: true
        });

        chrome.tabs.query({url: "https://www.dndbeyond.com/*"}, function (tabs) {
            if (tabs.length === 0) {
                return;
            }
            tabs.forEach(function (tab) {
                // console.log(tab);
                chrome.tabs.sendMessage(tab.id, {data: results}, function (response) {
                    // console.log('Sent message to connected tab.');
                    // close window after this.
                });
            });
        });
    });
}


function addRemoveListeners(fieldset) {
    let removeButtons = fieldset.getElementsByClassName('remove-character');
    for (var i = 0; i < removeButtons.length; i++) {
        removeButtons.item(i).addEventListener('click', function () {
            removeCharacterFields(this);
        })
    }
}

function addCharacterFields(data) {
    counter++;
    let newFields = htmlToElement(template, counter, data);
    let insertHere = document.getElementById('inserthere');
    insertHere.parentNode.insertBefore(newFields, insertHere);
    addRemoveListeners(newFields);
}

function removeCharacterFields(e) {
    e.parentNode.parentNode.parentNode.removeChild(e.parentNode.parentNode);
}

function init() {
    chrome.storage.sync.get(['data'], function (result) {
        let data = result.data;
        data.forEach(function (item, index) {
            addCharacterFields(item);
        });
    });
    document.getElementById('addcharacter').addEventListener("click", function (e) {
        addCharacterFields();
    });
    document.getElementById('characterform').addEventListener("submit", function (e) {
        e.preventDefault();
        processFormSubmit(e);
        window.location.reload(true);
    })
    chrome.storage.local.get(['message'], function (result) {
        console.log(result);
        if (result.message) {
            let message_container = document.getElementById('message-container');
            if (message_container === null) {
                document.body.appendChild(htmlToElement('<div id="message-container">Successfully saved changes.</div>', 0))
            }
            setTimeout(function () {
                let message_container = document.getElementById('message-container');
                // message_container.parentNode.removeChild(message_container);
                message_container.style = 'opacity:0';
            }, 500);
            chrome.storage.local.set({
                message: false
            });
        }
    });
}


document.addEventListener('DOMContentLoaded', init, false);
