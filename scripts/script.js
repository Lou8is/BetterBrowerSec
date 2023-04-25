//TODO : Icon by <a href="https://freeicons.io/profile/3335">MD Badsha Meah</a> on <a href="https://freeicons.io">freeicons.io</a>
//import domainlist from "../resources/tranco.js";
var domainList = new Set();
var debugOn = true;
var upgradeToSecure = true;

var domainsBlockedCountOnTab = new Map();

var loadingStatus=0;

var loadstatus = {
    NOT_LOADED: 0,
    LOADED: 1,
    LOADING: 2
};

function mlog(str){
    if (debugOn)
        console.log(str)
}

/**
 * From a full URL, extracts the domain part and check wether it belongs to the domains list.
 * The functions first check the 1st level domain, and goes 1 sub-domain deeper at a time.
 * While adding more checks, this allows to ignore special cases of TLD such as .co.uk
 * 
 * @param {string} rawUrl 
 * @returns {boolean} result
 */
function isDomainInList(rawUrl) {
    //will fill the list only if it was empty
    loadDomainsListFromJS();

    let begin=performance.now();
    //converts the url to an URL object for easier manipulation
    let url = new URL(rawUrl);
    mlog("Loading: "+rawUrl);

    //Takes the hostname part of the URL and splits it using '.' (e.g. for "sub.domain.com", gives [sub,domain,com])
    let hostnameSplited = url.hostname.split('.');

    //Use the rightmost part of the domain to init the check (e.g. for [sub,domain,com], takes "com")
    let hostnameToCheck = hostnameSplited[hostnameSplited.length-1];

    //Init the index for the next part to use (e.g. point to 1 (=domain) in [sub,domain,com])
    let nextPartIndex = hostnameSplited.length-2;
    let result = false;

    do { 
        //Adds the next part of the domain to check (e.g., is now "domain.com", then "sub.comain.com" at the next iteration)               
        hostnameToCheck = hostnameSplited[nextPartIndex]+"."+hostnameToCheck;
        
        //checks if domain is in list
        result = domainList.has(hostnameToCheck);
        mlog("--------------: "+ hostnameToCheck + "--" + result);        
        nextPartIndex--;

        //Stops when there is no sub-level left or when a domain is found in the list - we allow subdomains of allowed domains
    } while (nextPartIndex>=0 && !result)

    let end = performance.now();
        mlog("Lookup: " + (end - begin) + " ms")

    return result;
}

/**
 * 
 */
function isDomainInAllowList(url) {
    return false;
}

/**
 * Call the domain checking function and crafts the correct BlockingRequest as a @returns + upgrades to HTTPS is needed
 */
function blockRequestIfUnknown(request) {

    //to be returned when domain is allowed
    let allowResponse = {
        cancel: false,
        upgradeToSecure: upgradeToSecure
    };

    //request.documentUrl is defined for call within a page, we want to only test top-level calls from tabs
    if(request.documentUrl !== undefined) {
        return allowResponse;
    }
    
    //check allowlist for domain before everything
    if(isDomainInAllowList(request.url)) {
        return allowResponse;
    }

    if(isDomainInList(request.url)) {
        return allowResponse;
    } else {
        mlog("Want to cancel domain");
        updateToolbarOnBlock(request);
        return {
            redirectUrl: browser.runtime.getURL("views/blocked.html")
        };
    }
}

function updateToolbarOnBlock(request) {

}

/**
 * @deprecated
 */
function updateInterface(request, domainInList) {
    tabId = request.tabId;
    let tabCount=0;

    if (tabId===-1)
        return;

    if(!domainInList){
        if(domainsBlockedCountOnTab.has(tabId))
        tabCount=domainsBlockedCountOnTab.get(tabId);

        tabCount++;
        domainsBlockedCountOnTab.set(tabCount);

        browser.browserAction.setIcon({
            tabId,
            path: "icons/icon_alert-32.png"
        });
        browser.browserAction.setTitle({
            tabId,
            title: tabCount+" domains blocked on this tab"
        });
        //browser.pageAction.setPopup("BEURK !!!");
        //browser.pageAction.openPopup();
    }
}

/**
 * Loads the 1M website list from https://tranco-list.eu/
 * At the moment, list is from april 2023
 * Performance : about 1.3 second (i9-9 ; 64GB RAM ; SSD)
 * @deprecated
 */
function loadDomainsList(force=false) {

    //If list is already filled and is the function is not called on purpose - avoids multiple unneeded calls
    if(loadingStatus!==loadstatus.NOT_LOADED && !force)
        return;

    loadingStatus = loadstatus.LOADING;
    let begin = performance.now();
    let rUrl = browser.runtime.getURL('../resources/tranco.json');
    fetch(rUrl).then((response) => {
    return response.json();
    })
    .then((fileContent) => {
        domainList = new Set(fileContent["domain_list"]);
        let end = performance.now();
        mlog("Load list: " + (end - begin) + " ms")
        loadingStatus = loadstatus.LOADED;
    })
    .catch((cause) => {
        loadingStatus = loadstatus.NOT_LOADED;
        console.log(cause)});
}

/**
 * Loads the 1M website list from https://tranco-list.eu/
 * At the moment, list is from april 2023
 * Performance : about 0.5 second (i9-9 ; 64GB RAM ; SSD)
 * @deprecated
 */
function loadDomainsListFromJS(force=false) {

    //If list is already filled and is the function is not called on purpose - avoids multiple unneeded calls
    if(loadingStatus!==loadstatus.NOT_LOADED && !force)
        return;

    loadingStatus = loadstatus.LOADING;
    let begin = performance.now();
    domainList = new Set(laliste);
    let end = performance.now();
    mlog("Load list: " + (end - begin) + " ms")
    
    if(domainList.size > 0)
        loadingStatus = loadstatus.LOADED;
}

/**
 * All functions regarding startup
 */
function handleStartup() {
    
}

/**
 * On every request, block domain that does not belong to the 1M list (see function for details)
 * Also automaticaly upgrades to HTTPS
 */
browser.webRequest.onBeforeRequest.addListener(
    blockRequestIfUnknown,
    {urls: ["<all_urls>"]},
    ["blocking"]
);

/**
 * When browser starts, load the list of 1M most used websites in memory
 */
browser.runtime.onStartup.addListener(
    handleStartup
);