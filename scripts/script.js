//TODO : Icon by <a href="https://freeicons.io/profile/3335">MD Badsha Meah</a> on <a href="https://freeicons.io">freeicons.io</a>

var domainList = new Set();
var debugOn = true;
var upgradeToSecure = true;

var domainsBlockedCountOnTab = new Map();

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
 * Call the domain checking function and crafts the correct BlockingRequest as a @returns + upgrades to HTTPS is needed
 */
function blockRequestIfUnknown(request) {

    let domainInList = isDomainInList(request.url)

    if (!domainInList)
        mlog("Want to cancel domain")

    updateInterface(request, domainInList);

    return {
        cancel: !domainInList,
        upgradeToSecure: upgradeToSecure
    };
}

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
 */
function handleStartup() {
    let begin=performance.now();
    let rUrl = chrome.runtime.getURL('../resources/tranco.json');
    fetch(rUrl).then((response) => {
    return response.json();
    })
    .then((fileContent) => {
        domainList = new Set(fileContent["domain_list"]);
        let end = performance.now();
        mlog("Startup: " + (end - begin) + " ms")
    })
    .catch((cause) => console.log(cause));
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