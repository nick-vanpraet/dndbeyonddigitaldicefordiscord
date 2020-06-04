var popupWindow = window.open(
    chrome.extension.getURL("popup.html"),
    "exampleName",
    "width=400,height=400"
);
//window.close();


var counter = 0;


var template = `
	<section id="character-{index}" style="display: none" data-counter="{index}">
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
        chrome.tabs.query({url: "https://www.dndbeyond.com/*"}, function (tabs) {
            if (tabs.length === 0) {
                return;
            }
            tabs.forEach(function (tab) {
                // console.log(tab);
                chrome.tabs.sendMessage(tab.id, {data: results}, function (response) {
                    // console.log('Sent message to connected tab.');
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
    var newFields = htmlToElement(template, counter, data);
    newFields.style.display = 'flex';

    var insertHere = document.getElementById('writeroot');
    insertHere.parentNode.insertBefore(newFields, insertHere);
    addRemoveListeners(newFields);
}

function removeCharacterFields(e) {
    e.parentNode.parentNode.parentNode.removeChild(e.parentNode.parentNode);
}

function load() {
    chrome.storage.sync.get(['data'], function (result) {
        let data = result.data;
        data.forEach(function (item, index) {
            addCharacterFields(item);
        });
    });
}


function init() {
    load();
    document.getElementById('addcharacter').addEventListener("click", function (e) {
        addCharacterFields();
    });
    document.getElementById('characterform').addEventListener("submit", function (e) {
        return processFormSubmit(e);
    })
}


document.addEventListener('DOMContentLoaded', init, false);


/*
document.addEventListener('DOMContentLoaded', function() {
	var checkPageButton = document.getElementById('connect');
	checkPageButton.addEventListener('click', function() {

		chrome.tabs.executeScript({
			file: 'run.js'
		});


	}, false);
}, false);
*/