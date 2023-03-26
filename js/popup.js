const manifest = $.getJSON('/manifest.json') ;
const openOrCopy = getLocalStorage( 'open-or-copy' ) ;
const groupProps = getLocalStorage( 'tab-group' ) ;
const theme = getLocalStorage( 'theme' ) ;
const $body = $("body") ;
const $openOpt = $("input#open-opt[name='open-or-copy-option']") ;
const $tabGroup = $("#tab-group") ;
const $clearTabGroup = $("#clear-tab-group-input") ;
const $toggleDarkMode = $("#app-theme-toggle--button") ;
const $everythingElse = $("header, #bookmarks-placeholder, li a") ;
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

$clearTabGroup.click(() => {
    $tabGroup.val("") ;
    setLocalStorage('tab-group', { "name": "" } ) ;
    $clearTabGroup.removeClass("show") ;
}) ;

let $tocMenu = $("#toc-menu") ;
$tocMenu.change((evt) => {
    if($tocMenu.prop("checked"))
        $everythingElse.click(() => {
            $tocMenu.prop("checked", false) ;
        }) ;
    else
        $everythingElse.off("click") ;
}) ;

$toggleDarkMode.click(() => {
    $body.toggleClass("dark") ;
    $toggleDarkMode.text($body.hasClass("dark") ? "Light Mode" : "Dark Mode") ;
    setLocalStorage('theme', { "name": $body.hasClass("dark") ? "dark" : "light" } ) ;
}) ;

if(theme.name === "dark")
    $toggleDarkMode.trigger("click") ;

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
                            "data-href": `#${makeClassName(title)}`,
                            class: "bookmark-goto"
                        })
                        .text(trimTitle(item.title))
                )
            ) ;
    }
    return $list ;
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

function setListeners() {
    $(".bookmark-url").click((evt) => {
        let url = $(evt.currentTarget).data("url") ;
        let groupName = $("#tab-group").val() ;
        let title = $(evt.currentTarget).data("group") ;
        urlOnClick(url, groupName || title);
    }) ;

    $(".bookmark-goto").click((evt) => {
        evt.preventDefault() ;
        evt.stopPropagation() ;
        let id = $(evt.currentTarget).attr("data-href") ;
        $("html, body").animate({ scrollTop: $(id)?.offset()?.top-74 }) ;
        $tocMenu.prop("checked", false) ;
    }) ;

    $(".bookmark-title span").click((evt) => {
        let title = $(evt.currentTarget).parent().attr("title") ;
        $tabGroup.val(title).trigger("input") ;
    }) ;

    $("#toc-placeholder li:has(> ul > li)").click((evt) => {
        evt.stopPropagation() ;
        $(evt.currentTarget).children("ul").toggleClass("show") ;
    }) ;
}

(() => {
    let cache = getLocalStorage('list-cache') ;
    let timestamp = new Date().getTime() ;
    const CACHE_EXPIRE = 60000 ; // milliseconds

    if(typeof cache === "object" &&
       cache.hasOwnProperty("processLevelResult") &&
       cache.hasOwnProperty("constructToCResult") &&
       timestamp < cache.expires) {
        $("#loading-spinner").removeClass("show") ;
        $("#bookmarks-placeholder").html(cache.processLevelResult) ;
        $("#toc-placeholder").html(cache.constructToCResult) ;
        setListeners();
    } else {
        chrome.bookmarks.getTree().then(async (bookmarks) => {
            bookmarks = sortBookmarks(bookmarks);

            let [, list] = await Promise.all([
                processLevel(bookmarks[0].children, 1),
                constructToC(bookmarks[0].children)
            ]);

            let $tocPlaceholder = $("#toc-placeholder");
            $tocPlaceholder.append(list);
            $("#toc-placeholder > ul > li > ul").addClass("show");
            $("#loading-spinner").removeClass("show");

            setLocalStorage('list-cache', {
                processLevelResult: $("#bookmarks-placeholder").html(),
                constructToCResult: $tocPlaceholder.html(),
                created: timestamp,
                expires: timestamp + CACHE_EXPIRE
            });

            setListeners();
        });
    }
})() ;
