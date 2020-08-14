var counter = 0;

// Don't allow query parameters or fragments so our background.js
// can always detect the presence of this tab when requested.
const validPath = window.location.protocol + '//' + window.location.host + window.location.pathname;
if (window.location.href !== validPath) {
    window.location.replace(validPath);
}

document.addEventListener('DOMContentLoaded', function() {
    CharacterManager.init();
}, false);

const CharacterManager = {
    template: `
            <div id="{uuid}" class="mdl-cell mdl-cell--4-col mdl-cell--4-col-tablet mdl-cell--8-col-phone">
                <div class="demo-card-event mdl-card mdl-shadow--2dp">
                    <div class="mdl-card__title mdl-card--expand">
                        <form id="form-{uuid}" class="character-forms">
                            <div class="mdl-textfield mdl-js-textfield">
                                <input class="dd4d-listen-change mdl-textfield__input dd4d-character-name" type="text" id="character_name-{uuid}" name="name" data-character="{uuid}" data-replace-name required>
                                <label class="mdl-textfield__label" for="character_name-{uuid}">Character Name</label>
                            </div>
                            <div class="mdl-textfield mdl-js-textfield">
                                <input class="dd4d-listen-change mdl-textfield__input dd4d-character-sheet" type="text" id="character_page-{uuid}" name="character" data-character="{uuid}" data-replace-char required pattern="https:\\/\\/www\\.dndbeyond.com\\/profile\\/.*\\/characters\\/[0-9]+$" title="D&D Beyond Character Sheet Link">
                                <label class="mdl-textfield__label" for="character_page-{uuid}">D&D Beyond Character Sheet</label>
                            </div>
                            <div class="mdl-textfield mdl-js-textfield">
                                <input class="dd4d-listen-change mdl-textfield__input dd4d-destination" type="text" id="destination_url-{uuid}" name="destination" data-character="{uuid}" data-replace-destination required>
                                <label class="mdl-textfield__label" for="destination_url-{uuid}">Discord Webhook</label>
                            </div>
                        </form>
                    </div>
                    <div class="mdl-card__menu">
                        <button id="dd4d-beyond-link-{uuid}" class="mdl-button mdl-button--icon mdl-js-button mdl-js-ripple-effect dd4d-beyond-link" data-character="{uuid}">
                            <i class="material-icons">open_in_new</i>
                        </button>
                    </div>
                    <div class="mdl-card__actions mdl-card--border">
                        <a class="mdl-button mdl-button--colored mdl-js-button mdl-js-ripple-effect dd4d-remove" data-character="{uuid}">
                            Remove
                        </a>
                        <div class="mdl-layout-spacer"></div>
                        <div class="mdl-card__actions-switch">
                            <label class="mdl-switch mdl-js-switch mdl-js-ripple-effect" for="active-{uuid}">
                                <input type="checkbox" id="active-{uuid}" class="dd4d-listen-change mdl-switch__input dd4d-active-checkbox" data-character="{uuid}" name="active" data-replace-check>
                            </label>
                        </div>

                    </div>
                </div>
            </div>
`,
    data: {},
    init: function() {
        this.loadAllCharacterData();
        this.setUpNewCharacterCreationListener();
    },
    setUpNewCharacterCreationListener: function() {
        // Setup listener for "create new character" submit.
        document.getElementById('dd4d-add-character-form').addEventListener("submit", function(event) {
            let [uuid, character] = CharacterManager.createCharacter();
            CharacterManager.addCharacterFields(uuid, character);
            event.preventDefault();
            this.reset();
            let inputs = this.getElementsByClassName('mdl-textfield__input');
            for (let i = 0; i < inputs.length; i++) {
                inputs.item(i).parentNode.classList.remove("is-dirty");
            }
            componentHandler.upgradeDom();
        });
    },
    loadAllCharacterData: function() {
        chrome.storage.sync.get(['characters'], function(result) {
            CharacterManager.data = result.characters || {};
            CharacterManager.buildCharacterCards();
        });
    },
    snackbarContainer: function() {
        return document.getElementById('message-container');
    },
    closeSnackbar: function() {
        let snackbarContainer = CharacterManager.snackbarContainer();
        snackbarContainer.classList.remove('mdl-snackbar--active');
        snackbarContainer.setAttribute("aria-hidden", "true");
    },
    openSnackBar: function() {
        CharacterManager.closeSnackbar();
        const data = {
            message: 'Saved changes',
            actionHandler: CharacterManager.closeSnackbar,
            actionText: 'Got it'
        };
        CharacterManager.snackbarContainer().MaterialSnackbar.showSnackbar(data);
    },
    getCharacter: function(uuid) {
        return this.data[uuid] || {}
    },
    saveCharacter: function(uuid, data) {
        this.data[uuid] = data;
        this.insertCharacterAvatar(uuid);
        this.saveAllCharacterData(this.data);
    },
    deleteCharacter: function(uuid) {
        delete this.data[uuid];
        this.saveAllCharacterData(this.data);
    },
    saveAllCharacterData: function(data) {
        chrome.storage.sync.set({
            characters: data
        }, function() {
            CharacterManager.openSnackBar();
        });
    },
    buildCharacterCards: function() {
        for (const property in this.data) {
            CharacterManager.addCharacterFields(property, CharacterManager.getCharacter(property));
        }
        componentHandler.upgradeDom();
    },
    createCharacter: function() {
        let Character = {
            name: document.getElementById('new_character_name').value,
            character: document.getElementById('new_character_page').value,
            destination: document.getElementById('new_destination_url').value,
            uuid: Date.now(),
            active: true
        }
        CharacterManager.saveCharacter(Character.uuid, Character);
        return [Character.uuid, Character];
    },
    removeCharacter: function(e) {
        let container = document.getElementById(e.dataset.character);
        container.parentNode.removeChild(container);
        CharacterManager.deleteCharacter(e.dataset.character);
    },
    addCharacterFields: function(uuid, data) {
        let newFields = CharacterManager.htmlToElement(CharacterManager.template, uuid, data);
        let insertHere = document.getElementById('dd4d-add-character-container');
        insertHere.parentNode.insertBefore(newFields, insertHere);
        this.insertCharacterAvatar(uuid);
        CharacterManager.addCharacterListeners(newFields);
    },
    addCharacterListeners: function(fieldset) {
        let removeButtons = fieldset.getElementsByClassName('dd4d-remove');
        for (let i = 0; i < removeButtons.length; i++) {
            removeButtons.item(i).addEventListener('click', function() {
                CharacterManager.removeCharacter(this);
            })
        }
        let inputs = fieldset.getElementsByClassName('dd4d-listen-change');
        for (let i = 0; i < inputs.length; i++) {
            inputs.item(i).addEventListener('change', function() {
                let uuid = this.dataset.character;
                let form = document.getElementById('form-' + uuid);
                if (form.reportValidity()) {
                    CharacterManager.handleCharacterFormSubmit(uuid);
                } else if (this.type === 'checkbox') {
                    // Revert value for checkbox.
                    this.checked = !this.checked;
                }
            })
        }
        let forms = fieldset.getElementsByTagName('form');
        for (let i = 0; i < forms.length; i++) {
            forms.item(i).addEventListener('submit', function(e) {
                e.preventDefault();
                CharacterManager.handleCharacterFormSubmit(e.submitter.dataset.character)
                return false;
            })
        }
        let links = fieldset.getElementsByClassName('dd4d-beyond-link')
        for (let i = 0; i < links.length; i++) {
            links.item(i).addEventListener('click', function(e) {
                window.open(CharacterManager.getCharacter(this.dataset.character).character);
            })
        }
    },
    htmlToElement: function(html, uuid, data = {}) {
        let e = document.createElement('template');

        html = html.trim();
        html = html.replace(/{uuid}/g, uuid)

        if (data.character) {
            html = html.replace('data-replace-char', 'value="' + data.character + '"')
        }
        if (data.destination) {
            html = html.replace('data-replace-destination', 'value="' + data.destination + '"')
        }
        if (data.active) {
            html = html.replace('data-replace-check', 'checked')
        }
        if (data.name) {
            html = html.replace('data-replace-name', 'value="' + data.name + '"')
        }

        e.innerHTML = DOMPurify.sanitize(html);
        return e.content.firstChild;
    },
    handleCharacterFormSubmit: function(uuid) {
        let container = document.getElementById(uuid);
        let Character = CharacterManager.getCharacter(uuid);
        let inputs = container.querySelectorAll('input[data-character="' + uuid + '"]')
        inputs.forEach(function(element) {
            Character[element.name] = element.value;
            if (element.type === 'checkbox') {
                Character[element.name] = element.checked;
            }
        })
        CharacterManager.saveCharacter(uuid, Character);
    },
    insertCharacterAvatar: function(uuid) {
        let character = this.getCharacter(uuid);
        let characterID = character.character.substring(character.character.lastIndexOf('/') + 1);
        let proxyUrl = 'https://cors-anywhere.herokuapp.com/';
        let url = 'https://character-service.dndbeyond.com/character/v3/character/' + characterID;
        fetch(proxyUrl + url)
            .then(res => res.json())
            .then((out) => {
                let html = '<img src="' + out.data.avatarUrl + '" height="32px" width="32px">';
                let e = document.createElement('template');
                html = html.trim();
                e.innerHTML = DOMPurify.sanitize(html);
                let target = document.getElementById("dd4d-beyond-link-" + uuid);
                target.innerHTML = '';
                target.appendChild(e.content.firstChild);
            })
            .catch(err => {
                let html = '<i class="material-icons">open_in_new</i>';
                let e = document.createElement('template');
                html = html.trim();
                e.innerHTML = DOMPurify.sanitize(html);
                let target = document.getElementById("dd4d-beyond-link-" + uuid);
                target.innerHTML = '';
                target.appendChild(e.content.firstChild);
            });
    }
}