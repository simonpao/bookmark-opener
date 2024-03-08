const manifest = $.getJSON('/manifest.json') ;
const openOrCopy = getLocalStorage( 'open-or-copy' ) ;
const groupProps = getLocalStorage( 'tab-group' ) ;
const theme = getLocalStorage( 'theme' ) ;
const $body = $("body") ;
const $openOpt = $("input#open-opt[name='open-or-copy-option']") ;
const $tabGroup = $("#tab-group") ;
const $clearTabGroup = $("#clear-tab-group-input") ;
const $searchInput = $("#search-input") ;
const $clearSearch = $("#clear-search-input") ;
const $everythingElse = $("header, #bookmarks-placeholder, li a") ;
const CACHE_EXPIRE = 60000 ; // milliseconds
let showingNewBookmarkWindow = false ;
let pathInput ;
let timeout ;

manifest.then((man) => {
    $("#version--div").text(`v. ${man.version}`) ;
})

if(!!openOrCopy.opt)
    $(`input#${openOrCopy.opt}-opt[name='open-or-copy-option']`).prop("checked", true) ;

$("input[name='open-or-copy-option']").change(() => {
    let selectedOpt = $openOpt.prop("checked") ? "open" : "copy" ;
    setLocalStorage('open-or-copy', { "opt": selectedOpt } ) ;
}) ;

$tabGroup.val(typeof groupProps.name === "undefined" ? "" : groupProps.name) ;
if($tabGroup.val() !== "") $clearTabGroup.addClass("show") ;

$tabGroup.on("input", (evt) => {
    setLocalStorage('tab-group', { "name": $tabGroup.val() } ) ;

    if($tabGroup.val() !== "")
        $clearTabGroup.addClass("show") ;
    else
        $clearTabGroup.removeClass("show") ;
}) ;

$searchInput.focus() ;
$searchInput.off('input').on("input", () => {
    let cache = getLocalStorage('list-cache') ;
    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(cache.processLevelResult,"text/html");

    if($searchInput.val() !== "") {
        $clearSearch.addClass("show");

        // Hide all URLs that do not match search text
        let bookmarks = xmlDoc.getElementsByClassName('bookmark-url') ;
        for(let item of bookmarks) {
            let searchTokens = $searchInput?.val()?.toLowerCase().split(' ') ;
            let found = true ;
            for(let token of searchTokens) {
                if(token && item?.text?.toLowerCase()?.match(new RegExp(token)) === null) {
                    found = false ;
                    break ;
                }
            }
            if(!found) item.classList.add('hidden') ;
        }

        // Hide all titles that now contain no children
        let elements = xmlDoc.querySelectorAll('.bookmark-url, .bookmark-title') ;
        let currentTitle ; let anyNotHidden = false ;
        for(let elem of elements) {
            if(elem.classList.contains('bookmark-title')) {
                if (!anyNotHidden)
                    currentTitle?.classList.add('hidden');
                currentTitle = elem;
                anyNotHidden = false;
            } else if(!elem.classList.contains('hidden')) {
                anyNotHidden = true;
            }
        }

        // Remove last title in set if none of its children hidden
        if (!anyNotHidden)
            currentTitle?.classList.add('hidden');
    } else {
        $clearSearch.removeClass("show");
    }

    $("#bookmarks-placeholder").html(xmlDoc.getRootNode().getElementsByTagName('body')[0].innerHTML) ;
    setListeners();
}) ;

$clearSearch.off('click').on('click', () => {
    $searchInput.val("") ;
    $clearSearch.removeClass("show") ;
    let cache = getLocalStorage('list-cache') ;
    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(cache.processLevelResult,"text/html");
    $("#bookmarks-placeholder").html(xmlDoc.getRootNode().getElementsByTagName('body')[0].innerHTML) ;
    setListeners();
}) ;

$clearTabGroup.on('click', () => {
    $tabGroup.val("") ;
    setLocalStorage('tab-group', { "name": "" } ) ;
    $clearTabGroup.removeClass("show") ;
}) ;

let $tocMenu = $("#toc-menu") ;
$tocMenu.change((evt) => {
    let $tocMenuItems = $("#toc-placeholder a.bookmark-goto");
    if($tocMenu.prop("checked")) {
        $everythingElse.on("click", () => {
            $tocMenu.prop("checked", false);
            $tocMenuItems.off("keydown") ;
        });

        if(!$tocMenuItems) return ;
        $($tocMenuItems[0])?.focus();
        $tocMenuItems.on("keydown", (evt) => {
            let validCodes = ["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft", "Tab"]
            if (validCodes.includes( evt.code )) {
                evt.preventDefault() ;
                evt.stopPropagation() ;

                let checkedItem = 0 ;
                $tocMenuItems.each((index, value) => {
                    if($(value).is(":focus"))
                        checkedItem = index ;
                }) ;
                if(evt.code === "ArrowUp" || evt.code === "ArrowLeft") {
                    checkedItem = checkedItem - 1 < 0 ? $tocMenuItems.length - 1 : checkedItem - 1 ;
                } else {
                    checkedItem = checkedItem + 1 >= $tocMenuItems.length ? 0 : checkedItem + 1 ;
                }
                $($tocMenuItems[checkedItem])?.parents("ul").addClass("show") ;
                $($tocMenuItems[checkedItem])?.focus() ;
            }
        }) ;
    } else {
        $everythingElse.off("click");
        $tocMenuItems.off("keydown") ;
        $searchInput.focus() ;
    }
}) ;

function toggleToC() {
    let toggle = $tocMenu.prop("checked")
    $tocMenu.prop("checked", !toggle).trigger("change") ;
}

window.addEventListener("keydown", (evt) =>{
    if(evt.getModifierState("Control")) {
        switch (evt.code) {
            case "ArrowRight":
                evt.preventDefault() ;
                executeCommand("select-copy");
                break;
            case "ArrowLeft":
                evt.preventDefault() ;
                executeCommand("select-open");
                break;
            case "Period":
                if(!evt.getModifierState("Shift")) {
                    evt.preventDefault() ;
                    executeCommand("toggle-table-of-contents");
                }
                break;
            case "Slash":
                evt.preventDefault() ;
                executeCommand("create-new-bookmark");
                break;
        }
    } else if(showingNewBookmarkWindow) {
        switch(evt.code) {
            case "Escape":
                evt.preventDefault() ;
                executeCommand("close-new-bookmark");
                break ;
            case "Enter":
                evt.preventDefault() ;
                executeCommand("save-new-bookmark");
                break ;

        }
    }
}) ;

chrome.commands.onCommand.addListener((command) => {
    executeCommand(command) ;
});

function executeCommand(command) {
    switch(command) {
        case "toggle-table-of-contents":
            toggleToC() ;
            break ;
        case "select-open":
            $(`input#open-opt[name='open-or-copy-option']`).prop("checked", true).trigger("change") ;
            break ;
        case "select-copy":
            $(`input#copy-opt[name='open-or-copy-option']`).prop("checked", true).trigger("change") ;
            break ;
        case "create-new-bookmark":
            showNewBookmarkWindow() ;
            break ;
        case "close-new-bookmark":
            closeNewBookmarkWindow() ;
            break ;
        case "save-new-bookmark":
            saveNewBookmark().then(res => {
                if(res) {
                    loadBookmarks();
                    closeNewBookmarkWindow();
                }
            }) ;
            break ;
        default:
            console.log(`Command "${command}" triggered`);
    }
}

function showNewBookmarkWindow() {
    chrome.tabs.query({active: true, lastFocusedWindow: true}, tabs => {
        if(tabs.length) {
            showingNewBookmarkWindow = true;
            const $newBookmarkTitleInput = $("#new-bookmark-title") ;
            $newBookmarkTitleInput.val(tabs[0]?.title) ;
            $("#new-bookmark-url").val(tabs[0]?.url) ;
            $("#new-bookmark-window--div").addClass("show");
            $newBookmarkTitleInput.select().focus() ;

            pathInput.enable() ;
        } else {
            showMessage("error-query-tab") ;
        }
    });
}

async function saveNewBookmark() {
    if(!pathInput.selection.length) {
        showMessage("error-select-folder") ;
        return false ;
    }

    try {
        let folder = pathInput._value;
        let title = $("#new-bookmark-title").val();
        let url = $("#new-bookmark-url").val();

        if (folder[folder.length - 1] !== "")
            pathInput.selection.push("new");

        let parentId;
        let fh = pathInput.pathHierarchy;
        let fhs = pathInput.selection;
        for (let i in fhs) if (fhs.hasOwnProperty(i)) {
            if (fhs[i] === "new") {
                if (title && parentId) {
                    let newFolder = await createFolder(folder[i], parentId);
                    fh = newFolder.children;
                    parentId = newFolder.id;
                }
            } else {
                parentId = fh[fhs[i]].id;
                fh = fh[fhs[i]].children;
            }
        }

        await createBookmark(title, url, parentId);
        return true;
    } catch(e) {
        showMessage("error-create-bookmark") ;
        console.error(e) ;
        return false ;
    }
}

async function createBookmark(title, url, folderId) {
    return new Promise((resolve, reject) => {
        if(!folderId || !title || !url) {
            reject("Error creating bookmark") ;
            return ;
        }
        chrome.bookmarks.create({
            parentId: folderId.toString(),
            title: title,
            url: url,
        }, newBookmark => {
            resolve(newBookmark) ;
        });
    }) ;
}

async function createFolder(title, parentId) {
    return new Promise((resolve, reject) => {
        if(!title || !parentId) {
            reject("Error creating folder") ;
            return ;
        }
        chrome.bookmarks.create(
            {
                parentId: parentId.toString(),
                title: title
            }, newFolder => {
                resolve(newFolder) ;
            },
        );
    }) ;
}

function closeNewBookmarkWindow() {
    showingNewBookmarkWindow = false ;
    $("#new-bookmark-window--div").removeClass("show") ;
    $("#new-bookmark-title").val("") ;
    $("#new-bookmark-url").val("") ;

    pathInput.disable() ;
    pathInput.clear() ;

    $searchInput.focus() ;
}

function showMessage(type) {
    let $elem = $(`.snackbar.${type}`) ;
    if(timeout) {
        clearTimeout(timeout) ;
        $(".snackbar").removeClass("show") ;
    }
    $elem.addClass("show") ;
    timeout = setTimeout(() => { $elem.removeClass("show"); }, 3000);
}

function urlOnClick(url, groupName) {
    let radioValue = $("input[name='open-or-copy-option']:checked").val();
    if(radioValue === "open") {
        chrome.tabs.create({
            active: false,
            url: url
        }, async (tab) => {
            if(!!groupName) {
                let tabGroup = await chrome.tabGroups.query( { title: groupName } ) ;
                if(!tabGroup.length) {
                    const groupId = await chrome.tabs.group({ tabIds: tab.id });
                    await chrome.tabGroups.update(groupId, { title: groupName });
                } else {
                    await chrome.tabs.group({ groupId: tabGroup[0].id, tabIds: tab.id });
                }
            }
        }) ;
    } else {
        navigator.clipboard.writeText(url).then(() => {
            showMessage("url") ;
        }) ;
    }
}

function getLocalStorage(key) {
    try {
        let value = localStorage.getItem( `thing-opener--${key}` );
        let object = JSON.parse( value );
        return object || {} ;
    } catch ( e ) {
        console.error(e) ;
        return {} ;
    }
}

function setLocalStorage(key, object) {
    try {
        let value = JSON.stringify(object) ;
        localStorage.setItem( `thing-opener--${key}`, value ) ;
        return true ;
    } catch ( e ) {
        console.error(e) ;
        return false ;
    }
}

function trimTitle(str) {
    return str.length > 35 ? `${str.substring(0, 32)}…`  : str
}

function makeClassName(str) {
    return str.replace(/[^a-zA-Z0-9-]/g, "_") ;
}

async function processLevel(bookmarks, l, p = "", t = "") {
    if(l > 6) l = 6 ;
    for(let item of bookmarks) {
        let title = t === "" ? item.title : `${t} › ${item.title}` ;
        if(item.title && item.url)
            $("#bookmarks-placeholder").append(
                $(`<a></a>`).text(trimTitle(item.title)).attr({
                    "tabIndex": "2",
                    "class": "bookmark-url",
                    "data-url": item.url,
                    "title": item.url,
                    "data-group": trimTitle(p)
                })
            ) ;
        else if(item.title && item.children && item.children.length)
            $("#bookmarks-placeholder").append(
                $(`<h${l}></h${l}>`).append(
                    $('<span></span>').text(title)
                ).attr({
                    id: makeClassName(title),
                    title: item.title,
                    class: "bookmark-title"
                })
            ) ;
        if(item.children && item.children.length)
            await processLevel(item.children, l+1, item.title, title) ;
    }
}

async function constructToC(bookmarks, t = "") {
    let $list = $("<ul></ul>") ;
    for(let item of bookmarks) {
        let title = t === "" ? item.title : `${t} › ${item.title}` ;
        if(item.title && item.children && item.children.length && !item.url)
            $list.append(
                $("<li></li>").append(
                    $("<a></a>")
                        .attr({
                            "tabindex": "-1",
                            "href": "#",
                            "data-href": `#${makeClassName(title)}`,
                            class: "bookmark-goto"
                        })
                        .text(trimTitle(item.title))
                ).append(
                    await constructToC(item.children, title)
                )
            ) ;
        else if(item.title && !item.url)
            $list.append(
                $("<li></li>").append(
                    $("<a></a>")
                        .attr({
                            "tabindex": "-1",
                            "href": "#",
                            "data-href": `#${makeClassName(title)}`,
                            class: "bookmark-goto"
                        })
                        .text(trimTitle(item.title))
                )
            ) ;
    }
    return $list ;
}

async function constructHierarchy(bookmarks) {
    let array = [] ;
    for(let item of bookmarks) {
        let obj = {} ;
        if(item.title && item.children && item.children.length) {
            obj.title = item.title;
            obj.id = item.id ;
            obj.parentId = item.parentId ;
        }
        if(item.children && item.children.length) {
            let children = await constructHierarchy(item.children) ;
            if(children.length > 0)
                obj.children = children ;
        }
        if(typeof obj.title === "string")
            array.push(obj) ;
    }
    return array ;
}

function sortBookmarks(bookmarks) {
    for(let i in bookmarks) {
        if(bookmarks[i].hasOwnProperty('children'))
            bookmarks[i].children = sortBookmarks(bookmarks[i].children) ;
    }

    return bookmarks.sort((a,b) => {
        return a.hasOwnProperty('children') && b.hasOwnProperty('children')
            ? 0 : (b.hasOwnProperty('children') ? -1 : 1)
    }) ;
}

function setDarkMode(toggle) {
    const $toggleDarkMode = $("#app-theme-toggle--button") ;
    $toggleDarkMode.off('click').on('click', () => {
        $body.toggleClass("dark") ;
        $toggleDarkMode.text($body.hasClass("dark") ? "Light Mode" : "Dark Mode") ;
        setLocalStorage('theme', { "name": $body.hasClass("dark") ? "dark" : "light" } ) ;
    }) ;

    if(theme.name === "dark" && toggle)
        $toggleDarkMode.trigger("click") ;
}

function setListeners() {
    const $bookmarkUrl = $(".bookmark-url") ;
    const bookmarkClick = (evt) => {
        let url = $(evt.currentTarget).data("url") ;
        let groupName = $("#tab-group").val() ;
        let title = $(evt.currentTarget).data("group") ;
        urlOnClick(url, groupName || title);
    }

    setDarkMode(false) ;

    $("#add-new-bookmark--button").on('click', evt => {
        $tocMenu.prop("checked", false).trigger("change") ;
        showNewBookmarkWindow() ;
    }) ;

    $bookmarkUrl.off('click').on('click', bookmarkClick) ;

    $bookmarkUrl.off('keypress').on('keypress', (evt) => {
        if(evt.key === 'Enter')
            bookmarkClick(evt) ;
    }) ;

    $(".bookmark-goto").off('click').on('click', (evt) => {
        evt.preventDefault() ;
        evt.stopPropagation() ;
        let id = $(evt.currentTarget).attr("data-href") ;
        $("html, body").animate({ scrollTop: $(id)?.offset()?.top-118 }) ;
        $tocMenu.prop("checked", false) ;
        $("#toc-placeholder a.bookmark-goto").off("keydown") ;
    }) ;

    $(".bookmark-title span").off('click').on('click', (evt) => {
        let title = $(evt.currentTarget).parent().attr("title") ;
        $tabGroup.val(title).trigger("input") ;
    }) ;

    $("#toc-placeholder li:has(> ul > li)").off('click').on('click', (evt) => {
        evt.stopPropagation() ;
        $(evt.currentTarget).children("ul").toggleClass("show") ;
    }) ;
}

function loadBookmarks(timestamp) {
    let $tocPlaceholder = $("#toc-placeholder");
    let $newBookmarkButton = $("#add-new-bookmark--button") ;
    let $appThemeButton = $("#app-theme-toggle--button") ;
    let $versionDiv = $("#version--div") ;
    let $bookmarksPlaceholder = $("#bookmarks-placeholder") ;
    let $loadingSpinner = $("#loading-spinner") ;

    $tocPlaceholder.html("") ;
    $tocPlaceholder.append($newBookmarkButton) ;
    $tocPlaceholder.append($appThemeButton) ;
    $tocPlaceholder.append($versionDiv) ;
    $bookmarksPlaceholder.html("") ;
    $bookmarksPlaceholder.append($loadingSpinner) ;
    $loadingSpinner.addClass("show");

    chrome.bookmarks.getTree().then(async (bookmarks) => {
        bookmarks = sortBookmarks(bookmarks);

        let [, list, hierarchy] = await Promise.all([
            processLevel(bookmarks[0].children, 1),
            constructToC(bookmarks[0].children),
            constructHierarchy(bookmarks[0].children)
        ]);

        pathInput = new PathInput( "new-bookmark-folder", hierarchy ) ;
        $tocPlaceholder.append(list);
        $("#toc-placeholder > ul > li > ul").addClass("show");
        $("#loading-spinner").removeClass("show");

        setLocalStorage('list-cache', {
            processLevelResult: $("#bookmarks-placeholder").html(),
            constructToCResult: $tocPlaceholder.html(),
            constructHierarchyResult: JSON.stringify(hierarchy),
            created: timestamp,
            expires: timestamp + CACHE_EXPIRE
        });

        setListeners();
    });
}

(() => {
    let cache = getLocalStorage('list-cache') ;
    let timestamp = new Date().getTime() ;

    if(typeof cache === "object" &&
       cache.hasOwnProperty("processLevelResult") &&
       cache.hasOwnProperty("constructToCResult") &&
       cache.hasOwnProperty("constructHierarchyResult") &&
       timestamp < cache.expires) {
        let hierarchy = JSON.parse(cache.constructHierarchyResult) ;
        pathInput = new PathInput( "new-bookmark-folder", hierarchy ) ;
        $("#loading-spinner").removeClass("show") ;
        $("#bookmarks-placeholder").html(cache.processLevelResult) ;
        $("#toc-placeholder").html(cache.constructToCResult) ;
        setDarkMode(false) ;
        setListeners();
    } else {
        loadBookmarks(timestamp) ;
    }
})() ;

setDarkMode(true) ;
