class PathInput {

    pathHierarchy = {} ;
    options = {} ;
    selection = [] ;
    filtered = [] ;
    filterIndex = 0 ;
    chars = [] ;
    enabled = false ;

    static slash = "\uFF0F" ;

    /**
     * @param id
     *      id of input element
     * @param pathHierarchy
     *      path hierarchy in following format
     *      [
     *        {
     *          "title": "parent",
     *          "children": [
     *             {
     *               "title": "child",
     *               "children": [ ... ]
     *             },
     *             ...
     *           ],
     *           ...
     *        }
     *      ]
     * @param options
     *
     * <label class="path-input--label">
     *     <input type="text" class="path-input--input" title="Separate folders with a slash ('/')."/>
     *     <span class="path-input-clear--span">×</span>
     * </label>
     */
    constructor(id, pathHierarchy, options = {}) {
        this.id = id ;
        this.options = { ...this.options, ...options } ;
        this.pathHierarchy = pathHierarchy ;
        this.input = document.getElementById(id) ;
        this.input.classList.add("path-input--input") ;
        this.input.title = "Separate folders with a slash ('/')" ;
        this.input.value = PathInput.slash ;

        let parent = this.input.parentNode ;
        this.inputContainer = document.createElement("label") ;
        this.inputContainer.id = `${id}--label` ;
        this.inputContainer.htmlFor = id ;
        this.inputContainer.classList.add("path-input--label") ;
        parent.replaceChild(this.inputContainer, this.input) ;

        // Insert a new span for background text
        this.backgroundText = document.createElement("span") ;
        this.backgroundText.id = `${id}-background-text--span` ;
        this.backgroundText.classList.add("path-input-background-text--span") ;
        this.inputContainer.appendChild(this.backgroundText);

        // Move input into parent label
        this.inputContainer.appendChild(this.input);

        // Insert a new span clear button
        this.clearButton = document.createElement("span") ;
        this.clearButton.id = `${id}-clear--span` ;
        this.clearButton.classList.add("path-input-clear--span") ;
        this.clearButton.innerText = "×" ;
        this.inputContainer.appendChild(this.clearButton);

        // Insert suggested data ul
        this.suggestions = document.createElement("ul") ;
        this.suggestions.id = `${id}-suggestions--ul` ;
        this.suggestions.classList.add("path-input-suggestions--ul") ;
        this.inputContainer.appendChild(this.suggestions);
    }

    // Add event listeners
    enable() {
        this.input.addEventListener("focusin", this.show.bind(this)) ;
        this.input.addEventListener("input", this.update.bind(this)) ;
        this.input.addEventListener("keyup", this.process.bind(this)) ;
        this.input.addEventListener("focusout", this.hide.bind(this)) ;
        this.input.addEventListener("scroll", this.scroll.bind(this)) ;
        this.clearButton.addEventListener("click", this.clear.bind(this)) ;

        this.enabled = true ;
    }

    // Remove event listeners
    disable() {
        this.input.removeEventListener("focusin", this.show.bind(this)) ;
        this.input.removeEventListener("input", this.update.bind(this)) ;
        this.input.removeEventListener("keyup", this.process.bind(this)) ;
        this.input.removeEventListener("focusout", this.hide.bind(this)) ;
        this.input.removeEventListener("scroll", this.scroll.bind(this)) ;
        this.clearButton.removeEventListener("click", this.clear.bind(this)) ;

        this.enabled = false ;
    }

    // Clear the input value
    clear() {
        this.selection = [] ;
        this.filtered = [] ;
        this.chars = [] ;
        this.input.value = PathInput.slash ;
    }

    // Show the suggestions box
    show(evt) {
        this.update(evt, false) ;
        this.suggestions.classList.add("show") ;
    }

    // Hide the suggestions box
    hide() {
        this.suggestions.classList.remove("show") ;
    }

    process(evt) {
        let insertPathName = () => {
            let text = this.input.value.split(PathInput.slash) ;
            if(this.filtered.length) {
                text[text.length-2] = this.filtered[this.filterIndex].title ;
                this.selection.push(parseInt(this.filtered[this.filterIndex].index)) ;
            } else {
                this.selection.push("new") ;
            }
            this.input.value = text.join(PathInput.slash) ;
            this.filterIndex = 0 ;
            this.update(evt, false) ;
        } ;

        switch(evt.code) {
            case "ArrowDown":
            case "ArrowUp":
                evt.preventDefault();
                let limit = this.input.value.split(PathInput.slash).length - 1
                this.input.value = this.input.value.split(PathInput.slash, limit).join(PathInput.slash) + PathInput.slash ;
                this.suggestions.children[this.filterIndex]?.classList.remove("selected") ;
                this.filterIndex += evt.code === "ArrowDown" ? 1 : -1 ;
                if(this.filterIndex >= this.filtered.length)
                    this.filterIndex = 0 ;
                if(this.filterIndex < 0)
                    this.filterIndex = this.filtered.length-1 ;
                this.suggestions.children[this.filterIndex]?.classList.add("selected") ;
                this.input.value += this.filtered[this.filterIndex]?.title || "New Folder" ;
                this.backgroundText.innerText = this.input.value ;
                break ;
            case "ArrowRight":
                evt.preventDefault();
                if(this.filtered[this.filterIndex]?.title) {
                    if (this.chars[this.chars.length - 1] === PathInput.slash)
                        this.input.value += this.filtered[this.filterIndex]?.title || "New Folder" ;
                    this.input.value = this.input.value + PathInput.slash;
                    insertPathName() ;
                    this.input.scrollLeft = this.chars.length * 24 ;
                }
                break ;
            case "Slash":
                evt.preventDefault();
                if(this.chars[this.chars.length-1] === PathInput.slash)
                    this.input.value += (this.filtered[this.filterIndex]?.title || "New Folder") + PathInput.slash ;
                else
                    this.input.value = this.input.value.replace(/\//g, PathInput.slash) ;
                insertPathName() ;
                this.input.scrollLeft = this.chars.length * 24 ;
                break ;
            case "Delete":
                evt.preventDefault();
                this.clear();
                this.update(evt, false) ;
                break ;
            case "Backspace":
                evt.preventDefault();
                if(this.chars[this.chars.length-1] === PathInput.slash)
                    return ;
                let i ;
                for(i = this.chars.length-1; i >= 0; i--)
                    if(this.chars[i] === PathInput.slash) {
                        i ++ ; break ;
                    }
                if(i === -1) {
                    this.chars = [];
                    this.input.value = "" ;
                } else {
                    this.chars.splice(i);
                    this.input.value = this.chars.join("") ;
                }
                this.update(evt, false) ;
                break ;
        }
    }

    update(evt, fromInput = true) {
        if(fromInput && evt.data === "/") {
            if(this.chars[this.chars.length-1] === PathInput.slash)
                this.input.value = this.chars.join("") ;
            return ;
        }

        if(fromInput && evt.inputType &&
            (evt.inputType !== "insertText" ||
                this.input.selectionStart-1 !== this.chars.length)) {
            this.input.value = this.chars.join("") ;
        }

        this.chars = this.input.value.split("") ;
        if(this.chars.length > 1) {
            this.clearButton.classList.add("show") ;
        } else {
            this.clearButton.classList.remove("show") ;
        }

        this.filtered = [] ;
        this.suggestions.innerHTML = "" ;
        let text = this.input.value ;

        let fh = this.pathHierarchy ;
        let index ;
        this.backgroundText.innerText = PathInput.slash ;
        for(index of this.selection) {
            if(index === "new") break ;
            this.backgroundText.innerText += fh[index].title + PathInput.slash ;
            fh = fh[index].children ;
        }

        if(index !== "new") {
            for(let i in fh) if(fh.hasOwnProperty(i)) {
                let currentFolder = text.split(PathInput.slash) ;
                currentFolder = currentFolder[currentFolder.length-1] ;
                if(fh[i]?.title?.toLowerCase()?.startsWith(currentFolder?.toLowerCase())) {
                    const listItem = document.createElement("li");
                    listItem.innerText = fh[i].title;
                    this.filtered.push(new FilteredItem(fh[i].title, i)) ;
                    this.suggestions.appendChild(listItem);
                }
            }
            if(this.filtered[this.filterIndex]?.title)
                this.backgroundText.innerText += this.filtered[this.filterIndex]?.title ;
            else
                this.backgroundText.innerText = this.input.value;
        } else {
            const listItem = document.createElement("li");
            listItem.innerText = "New Folder";
            this.suggestions.appendChild(listItem);
            this.backgroundText.innerText = this.input.value;
        }

        this.scroll() ;

        // Fire an event
        let updateEvt = new Event("updatePathInput") ;
        updateEvt.selection = this.selection ;
        updateEvt.filtered = this.filtered ;
        updateEvt.value = this.input.value ;
        updateEvt.chars = this.chars ;
        this.input.dispatchEvent(updateEvt) ;
    }

    scroll() {
        this.backgroundText.scrollLeft = this.input.scrollLeft ;
    }

    get _value() {
        let value = this.input.value.slice(1,this.input.value.length) ;
        return value.split(PathInput.slash) ;
    }
}

class FilteredItem {
    constructor(title, index) {
        this.title = title ;
        this.index = index ;
    }

    toString() {
        return "[" + this.index + "]: " + this.title ;
    }
}
