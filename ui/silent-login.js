const ICS = "https://ics.nightly.opendesk.qa";
const PORTAL = "https://portal.nightly.opendesk.qa";

// ---------------------------------------------------------------------------
// Toggle menu. It will be triggered after clicking the menu icon.
// ---------------------------------------------------------------------------
function _toggleMenu() {
  try {
    const menu = document.getElementById("opendeskMenu");

    if (menu.style.display !== "block") {
      menu.style.display = "block";
    } else {
      menu.style.display = "none";
    }
  } catch {
    // Do nothing
  }
}

// ---------------------------------------------------------------------------
// Return the html content of the category (menu items of category)
// ---------------------------------------------------------------------------
function getCategoryItems(entries) {
  try {
    let items = "";
    for (const entry of entries) {
      items += `
      <div style="display: flex; align-items:center; gap:16px; padding:8px;
                  font-size:14;"
      >
        <img src="${entry.icon_url}" height="20px" style="margin-left:12px;">
        <a href="${entry.link}" target="${entry.target}"
           style="text-decoration:none; font-weight:normal; color:#1F1F1F;">
          ${entry.display_name}
        </a>
      </div>
    `;
    }

    return items;
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// Return the hmtl content of the navigation menu
// ---------------------------------------------------------------------------
function getMenuItems(nav) {
  try {
    // Skip if no portal session
    const identifier = nav.categories?.[0]?.identifier;
    if (!identifier || identifier === "swp.anonymous") {
      throw new Error("no item");
    }

    let items = "";
    for (const cat of nav.categories) {
      // Category title in menu.
      items += `
      <div style="font-size:17; font-weight:700; letter-spacing: 0.05em;
                  padding:16px 60px 4px 12px;"
      >${cat.display_name}</div>
    `;

      // Category content (links) in menu.
      items += getCategoryItems(cat.entries);
    }

    return items;
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// createNavigationMenu
// ---------------------------------------------------------------------------
function createNavigationMenu(nav) {
  try {
    const menuItems = getMenuItems(nav);
    const menu = `
    <button id="opendeskMenuButton" tabindex="0" onclick="_toggleMenu()"
      aria-label="Toogle menu" style="background:none; border:none;"
    >
      <svg xmlns="http://www.w3.org/2000/svg" height="24px" width="24px"
        viewBox="0 0 24 24" fill="#000000" style="margin:12px 8px;"
      >
        <path d="M0 0h24v24H0z" fill="none"/>
        <path d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6
                 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0
                 6h4v-4h-4v4z"/>
      </svg>
      <div id="opendeskMenu"
        style="position:absolute; top:63px; left:8px; z-index:10;
               padding: 4px; background-color:white; color:#1F1F1F;
               border-radius: 4px; border: 1px solid; border-color:#e8e6e3;·
               box-shadow: rgba(118, 131, 156, 0.6) 4px 4px 12px 0px;
               text-align:left; cursor: default; display:none;"
      >${menuItems}</div>
    </button>
    `;

    // Close menu if clicked somewhere else.
    document.addEventListener("click", (event) => {
      try {
        // Skip if clicked to the menu button or to the menu.
        const menuButton = document.getElementById("opendeskMenuButton");
        if (menuButton.contains(event.target)) return;

        // Close menu if already visible.
        const menu = document.getElementById("opendeskMenu");
        if (menu.style.display !== "none") menu.style.display = "none";
      } catch {
        // Do nothing
      }
    });

    return menu;
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// createTopbar
// ---------------------------------------------------------------------------
function createTopbar(nav) {
  try {
    // Remove topbar if already exists to prevent duplicated topbars.
    const el = document.getElementById("opendeskTopbar");
    if (el) el.remove();

    // Create topbar
    const topDiv = document.createElement("div");
    topDiv.id = "opendeskTopbar";
    topDiv.style.gap = "14px";
    topDiv.style.height = "63px";
    topDiv.style.width = "100%";
    topDiv.style.display = "flex";
    topDiv.style.alignItems = "center";
    topDiv.style.backgroundColor = "white";
    topDiv.style.borderBottom = "1px solid #ccc";
    topDiv.style.boxShadow = "0 2px 5px rgba(0, 0, 0, 0.2)";
    topDiv.innerHTML = `
      <a href="${PORTAL}" tabindex="0" target="_blank"
        aria-label="Show portal" style="margin-left:16px"
      >
        <img src="${PORTAL}/univention/portal/icons/logos/domain.svg"
          style="width:82px; margin:16px 8px;"
          alt="OpenDesk">
      </a>
    `;

    // If the navigation data exists then add the navigation menu.
    const identifier = nav.categories?.[0]?.identifier;
    if (identifier && identifier !== "swp.anonymous") {
      topDiv.innerHTML += createNavigationMenu(nav);
    }

    document.body.insertBefore(topDiv, document.body.firstChild);
  } catch {
    // Do nothing.
  }
}

// ---------------------------------------------------------------------------
// getIdentity
// ---------------------------------------------------------------------------
async function getIdentity() {
  try {
    const url = `${ICS}/uuid`;
    const res = await fetch(url, {
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    if (res.status !== 200) throw "uuid request is rejected";

    const identity = await res.text();
    if (!identity) throw "missing identity";

    return identity;
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// updateUI
// ---------------------------------------------------------------------------
function updateUI(identity) {
  globalThis.notification.identity = identity;

  const el = document.getElementById("identity");
  el.textContent = `Logged in as ${globalThis.notification.identity}`;
  document.getElementById("button-call").disabled = false;
}

// ---------------------------------------------------------------------------
// getNavigationData
// ---------------------------------------------------------------------------
async function getNavigationData() {
  try {
    const url = `${ICS}/navigation.json`;
    const res = await fetch(url, {
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    if (res.status !== 200) throw "navigation data request is rejected";

    const nav = await res.json();
    if (!nav) throw "missing navigation data";

    return nav;
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// silentLogin
// ---------------------------------------------------------------------------
function silentLogin() {
  createTopbar({});

  const el1 = document.getElementById("opendeskIframeSilentLogin");
  if (el1) el1.remove();

  // Silent login inside a hidden iframe.
  const iframeSilentLogin = document.createElement("iframe");
  iframeSilentLogin.id = "opendeskIframeSilentLogin";
  iframeSilentLogin.src = `${ICS}/silent`;
  iframeSilentLogin.style.display = "none";
  document.body.appendChild(iframeSilentLogin);

  // Trigger the navigation iframe after the silent login is completed.
  iframeSilentLogin.onload = () => {
    const el2 = document.getElementById("opendeskIframeNavigation");
    if (el2) el2.remove();

    // UUID request inside this hidden iframe to refresh the session.
    // The silent login is not enough in some cases.
    const iframeNavigation = document.createElement("iframe");
    iframeNavigation.id = "opendeskIframeNavigation";
    iframeNavigation.src = `${ICS}/uuid`;
    iframeNavigation.style.display = "none";
    document.body.appendChild(iframeNavigation);

    // Get the navigation data and recreate the topbar with menu.
    iframeNavigation.onload = async () => {
      const identity = await getIdentity();
      updateUI(identity);

      const nav = await getNavigationData();
      createTopbar(nav);
    };
  };
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
silentLogin();
