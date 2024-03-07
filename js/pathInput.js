class PathInput {

    pathHierarchy = {} ;
    options = {} ;
    selection = [] ;
    filtered = [] ;
    chars = [] ;
    enabled = false ;

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
        this.options = options ;
        this.pathHierarchy = pathHierarchy ;
        this.input = document.getElementById(id) ;
        this.input.classList.add("path-input--input") ;
        this.input.title = "Separate folders with a slash ('/')" ;

        // Move input into parent label
        let parent = this.input.parentNode ;
        this.inputContainer = document.createElement("label") ;
        this.inputContainer.id = `${id}--label` ;
        this.inputContainer.htmlFor = id ;
        this.inputContainer.classList.add("path-input--label") ;
        parent.replaceChild(this.inputContainer, this.input) ;
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

    enable() {
        this.input.addEventListener("focusin", this.show.bind(this)) ;
        this.input.addEventListener("input", this.update.bind(this)) ;
        this.input.addEventListener("keyup", this.process.bind(this)) ;
        this.input.addEventListener("focusout", this.hide.bind(this)) ;
        this.clearButton.addEventListener("click", this.clear.bind(this)) ;

        this.enabled = true ;
    }

    disable() {
        this.input.removeEventListener("focusin", this.show.bind(this)) ;
        this.input.removeEventListener("input", this.update.bind(this)) ;
        this.input.removeEventListener("keyup", this.process.bind(this)) ;
        this.input.removeEventListener("focusout", this.hide.bind(this)) ;
        this.clearButton.removeEventListener("click", this.clear.bind(this)) ;

        this.enabled = false ;
    }

    clear() {
        this.selection = [] ;
        this.filtered = [] ;
        this.chars = [] ;
        this.input.value = "" ;
    }

    show(evt) {
        this.update(evt, false) ;
        this.suggestions.classList.add("show") ;
    }

    process(evt) {
        let insertPathName = () => {
            let text = this.input.value.split("/") ;
            if(this.filtered.length) {
                text[text.length-2] = this.filtered[0].title ;
                this.selection.push(parseInt(this.filtered[0].index)) ;
            } else {
                this.selection.push("new") ;
            }
            this.input.value = text.join("/") ;
            this.update(evt, false) ;
        } ;

        switch(evt.code) {
            case "ArrowRight":
                evt.preventDefault();
                if(this.chars[this.chars.length-1] === "/")
                    return ;
                this.input.value = this.input.value + "/" ;
                insertPathName() ;
                break ;
            case "Slash":
                evt.preventDefault();
                if(this.chars[this.chars.length-1] === "/")
                    return ;
                insertPathName() ;
                break ;
            case "Delete":
                evt.preventDefault();
                this.clear();
                this.update(evt, false) ;
                break ;
            case "Backspace":
                evt.preventDefault();
                if(this.chars[this.chars.length-1] === "/")
                    return ;
                let i ;
                for(i = this.chars.length-1; i >= 0; i--)
                    if(this.chars[i] === "/") {
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
            if(this.chars[this.chars.length-1] === "/")
                this.input.value = this.chars.join("") ;
            return ;
        }

        if(fromInput && evt.inputType &&
            (evt.inputType !== "insertText" ||
                this.input.selectionStart-1 !== this.chars.length)) {
            this.input.value = this.chars.join("") ;
        }

        this.chars = this.input.value.split("") ;
        if(this.chars.length) {
            this.clearButton.classList.add("show") ;
        } else {
            this.clearButton.classList.remove("show") ;
        }

        this.filtered = [] ;
        this.suggestions.innerHTML = "" ;
        let text = this.input.value ;

        let fh = this.pathHierarchy ;
        let index ;
        for(index of this.selection) {
            if(index === "new") break ;
            fh = fh[index].children ;
        }

        if(index !== "new") {
            for(let i in fh) if(fh.hasOwnProperty(i)) {
                let currentFolder = text.split("/") ;
                currentFolder = currentFolder[currentFolder.length-1] ;
                if(fh[i]?.title?.toLowerCase()?.startsWith(currentFolder?.toLowerCase())) {
                    const listItem = document.createElement("li");
                    listItem.innerText = fh[i].title;
                    this.filtered.push({ title: fh[i].title, index: i}) ;
                    this.suggestions.appendChild(listItem);
                }
            }
        } else {
            const listItem = document.createElement("li");
            listItem.innerText = "New Folder";
            this.suggestions.appendChild(listItem);
        }
    }

    hide() {
        this.suggestions.classList.remove("show") ;
    }
}