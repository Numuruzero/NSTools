// ==UserScript==
// @name        NetSuite Float Menu
// @namespace   jhutt.com
// @description A floating menu for NetSuite sales orders to quickly add notes and perform actions.
// @match       https://1206578.app.netsuite.com/app/accounting/transactions/salesord.nl*
// @require     https://cdn.jsdelivr.net/npm/@violentmonkey/dom@2
// @version     1.0
// ==/UserScript==

const url = window.location.href;
const orderID = url.match(/id=(\d+)/)?.[1];

//////////////////// Create the floating menu and its components \\\\\\\\\\\\\\\\\\\\\
//////////////////// Create and insert style node \\\\\\\\\\\\\\\\\\\\\
const style = document.createElement("style");
style.type = "text/css";
style.id = "opfloatstyle";
style.innerHTML = `#opfloatheader {
        cursor: move;
        background-color: #e4eaf5;
        text-align: center;
        font-size: 14px;
        padding: 8px 4px;
      }

      #opfloat {
        position: fixed;
        pointer-events: none;
        top: 8rem;
        right: 41rem;
        width: 150px;
        background-color: #f0f0f0;
        border: 1px solid #ccc;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        display: flex;
        flex-direction: column;
        opacity: 0.8;
        transition: opacity 0.3s ease;
      }

      /* Apply pointer events back to children elements */
      #opfloat * {
        pointer-events: auto;
      }

      #opfloat:hover,
      #opfloat:focus-within {
        opacity: 1;
      }

      #opfloatnotecontainer {
        flex: 1;
        display: flex;
        align-items: center;
        padding: 0 6px 0 0;
        border-radius: 15px;
        margin: 0;
        background-color: aliceblue;
        width: fit-content;
        height: fit-content;
        position: absolute;
        left: 150px;
        /* bottom: 1px; */
      }

      #opfloatnotecollapse {
        /* flex-wrap: wrap; */
        /* align-content: center; */
        /* overflow-y: auto; */
        /* flex: 1;
        display: flex;
        align-items: center;
        padding: 0 6px 0 0;
        border-radius: 15px;
        margin: 0; */
        background-color: aliceblue;
        width: fit-content;
        height: fit-content;
        padding: 5px 0 5px 2px;
      }

      #opfloatpostnoteloader {
        display: block;
        opacity: 0;
        position: absolute;
        top: 2px;
        left: 1px;
        transition: top 0.3s ease, opacity 0.3s ease;
        z-index: -1;
        /* height: 20px; */
        /* width: 20px; */
        /* transform: translate(-50%, -50%); */
      }

      #opfloatnotecollapsebutton {
        cursor: pointer;
        height: auto;
        display: flex;
        align-self: stretch;
        align-content: center;
        flex-wrap: wrap;
        flex-grow: 1;
        margin: 0;
      }

      #opfloatnote {
        /* display: grid; */
        resize: both;
        overflow: auto;
        background-color: rgb(255, 255, 255);
        padding: 5px;
        height: 200px;
        width: 200px;
        font-style: normal;
      }

      .opfloatcat {
        margin: 8px 0;
        /* height: 120px; */
      }

      /* .opcollapsible {
      } */

      .collcatbtn {
        background-color: #a8b3c7;
        border: 2px solid #9f9fbd;
        /* border: none; */
        padding: 10px;
        cursor: pointer;
        width: 100%;
        height: 75px;
        text-align: center;
        /* margin: 7px 0; */
      }

      .catbtn {
        background-color: #f0f0f0;
        border: 2px solid darkgrey;
        /* padding: 10px; */
        /* padding-bottom: 16px; */
        cursor: pointer;
        height: 75px;
        /* flex-basis: 88px; */
        /* flex-grow: 88; */
        width: 239px;
        /* width: 100%; */
        /* text-align: left; */
        /* margin-top: 2px; */
        margin-right: 3px;
        margin-left: 3px;
      }

      .catbtn:hover {
        background-color: #d0d0d0;
      }

      .catbtn:active {
        background-color: #c0c0c0;
      }

      .opcollcontent {
        max-width: 0;
        overflow: hidden;
        transition: max-width 0.2s ease-out, max-height 0.2s ease-out,
          left 0.2s ease-out;
      }

      .opcollcatcontent {
        display: inline-flex;
        /* flex-basis: 12px; */
        position: absolute;
        left: 0;
        /* z-index: 1234; */
      }

      .loader {
        border: 6px solid #434343; /* Light grey */
        border-top: 6px solid #3498db; /* Blue */
        border-radius: 51%;
        width: 20px;
        height: 20px;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }

      #textfield {
        display: inline-block;
        width: 100%;
        /* height: -webkit-fill-available; */
      }

      #ticker {
        display: none;
      }

      .noteinsert {
        background-color: aquamarine;
        display: inline;
        color: #1c312a;
        font-style: italic;
        font-size: 12px;
        border: 1px solid #000000;
        padding: 1px;
        border-radius: 7px;
        display: none;
        /* pointer-events: none !important; */ /* Prevent interaction with the note insert */
        /* cursor: no-drop; */
        width: fit-content;
        height: fit-content;
      }`;
document.head.appendChild(style);

//////////////////// Create and insert body node \\\\\\\\\\\\\\\\\\\\\
const floatingMenu = document.createElement("div");
floatingMenu.id = "bigcontainer";
floatingMenu.innerHTML = `<div id="ticker">0</div>
        <div id="opfloat">
        <div id="opfloatheader"><h2>Order Actions</h2></div>
        <!-- Customer comment notes -->
        <div id="opfloatcatcstcmt" class="opfloatcat">
          <div
            id="opfloatcatcstcmtcollapse"
            class="opcollcontent opcollcatcontent"
          >
            <button class="catbtn" data-note="No-action comment. ">
              No-action comment
            </button>
            <button class="catbtn" data-note="Copying ship note. ">
              Copying ship note
            </button>
          </div>
          <button id="opfloatbtncstcmt" class="collcatbtn opcollapsible">
            Customer Comment
          </button>
        </div>
        <!-- Fraud-type flag notes -->
        <div id="opfloatcatfraud" class="opfloatcat">
          <div
            id="opfloatcatfraudcollapse"
            class="opcollcontent opcollcatcontent"
          >
            <button
              class="catbtn"
              data-note="Low risk score, no review triggered. "
            >
              No review triggered
            </button>
          </div>
          <button id="opfloatbtnfraud" class="collcatbtn opcollapsible">
            Fraud
          </button>
        </div>
        <!-- Low Gross Profit flag notes -->
        <div id="opfloatcatlgp" class="opfloatcat">
          <div
            id="opfloatcatlgpcollapse"
            class="opcollcontent opcollcatcontent"
          >
            <button class="catbtn" data-note="LGP for solo keypad. ">
              Solo keypad
            </button>
            <button class="catbtn" data-note="LGP for solo light item. ">
              Solo light item
            </button>
            <button class="catbtn" data-note="LGP for replacement order. ">
              Replacement order
            </button>
            <button class="catbtn" data-note="LGP for influencer order. ">
              Influencer order
            </button>
            <button class="catbtn" data-note="LGP recalc'd XX%. ">
              Recalc'd
            </button>
            <button class="catbtn" data-note="LGP for known low GP item. ">
              Known item
            </button>
            <button class="catbtn" data-note="LGP for employee order. ">
              Employee order
            </button>
          </div>
          <button id="opfloatbtnlgp" class="collcatbtn opcollapsible">
            Low GP
          </button>
        </div>
        <!-- Bulk flag notes -->
        <div id="opfloatcatbulk" class="opfloatcat">
          <div
            id="opfloatcatbulkcollapse"
            class="opcollcontent opcollcatcontent"
          >
            <button
              class="catbtn"
              data-note="Bulk flag: address not residence. "
            >
              Not residence
            </button>
            <button
              class="catbtn"
              data-note="Bulk flag for dog-bone connectors. "
            >
              Dog-bones
            </button>
            <button class="catbtn" data-note="Bulk flag for multi-part items. ">
              Multi-part
            </button>
            <button class="catbtn" data-note="Bulk flag for wire management. ">
              Wire management
            </button>
          </div>
          <button id="opfloatbtnbulk" class="collcatbtn opcollapsible">
            Bulk
          </button>
        </div>
        <!-- ESD flag notes -->
        <div id="opfloatcatesd" class="opfloatcat">
          <div
            id="opfloatcatesdcollapse"
            class="opcollcontent opcollcatcontent"
          >
            <button
              class="catbtn"
              data-note="ESD Flag: all items are waiting for transfer. "
            >
              All items transferring
            </button>
          </div>
          <button id="opfloatbtnesd" class="collcatbtn opcollapsible">
            Ship Dates
          </button>
        </div>
        <!-- Mismatch flag notes -->
        <div id="opfloatcatmismatch" class="opfloatcat">
          <div
            id="opfloatcatmismatchcollapse"
            class="opcollcontent opcollcatcontent"
          >
            <button
              class="catbtn"
              data-note="Mismatch flag: No alternatives available. "
            >
              No alternatives
            </button>
          </div>
          <button id="opfloatbtnmismatch" class="collcatbtn opcollapsible">
            Mismatch
          </button>
        </div>
        <!-- Note area -->
        <div id="opfloatnotecontainer">
          <div id="opfloatnotecollapse" class="opcollcontent">
            <div class="loader" id="opfloatpostnoteloader"></div>
            <textarea id="opfloatnote"></textarea>
          </div>
          <p id="opfloatnotecollapsebutton" class="opcollapsible">&nbsp;></p>
        </div>
        <button id="notebutton">Add Note</button>
      </div>`;
document.body.appendChild(floatingMenu);

//////////////////// Append all the actual scripting \\\\\\\\\\\\\\\\\\\\\

//////////////////// Script to handle the note insert functionality ////////////////////
function insertNote(el) {
  const note = el.getAttribute("data-note");
  const noteField = document.getElementById("opfloatnote");
  noteField.value += `${note}`;
}
const allNoteBtns = document.getElementsByClassName("catbtn");
console.log(allNoteBtns);
// Add event listeners to all buttons with the class "catbtn"
for (let i = 0; i < allNoteBtns.length; i++) {
  allNoteBtns[i].addEventListener("click", function () {
    insertNote(this);
  });
}
//////////////////// Script to toggle the visibility of the note collapse section ////////////////////
const allColl = document.getElementsByClassName("opcollapsible");
for (let i = 0; i < allColl.length; i++) {
  allColl[i].addEventListener("click", function () {
    // this.classList.toggle("active");
    let content;
    // Carve out an exception for the note collapse button (unless they all end up going the same way)
    // if (this.id === "opfloatnotecollapsebutton") {
    content = this.previousElementSibling;
    // } else {
    // content = this.nextElementSibling;
    // }

    if (content.style.maxWidth) {
      content.style.maxWidth = null;
      if (this.id === "opfloatnotecollapsebutton") {
        content.style.maxHeight = "100px";
      } else {
        content.style.overflow = "hidden"; // Add overflow to prevent content from expanding
        content.style.left = "0"; // Reset left position for the content
      }
      // setTimeout(() => {
      //     content.style.overflow = "hidden"; // Add overflow to prevent content from expanding
      // }, 100); // Delay to allow the transition to take effect
    } else {
      content.style.maxWidth = content.scrollWidth + "px";
      if (this.id === "opfloatnotecollapsebutton") {
        content.style.maxHeight = null; // Remove max height to allow full expansion
      } else {
        content.style.left = "-" + content.scrollWidth + "px"; // Adjust left position for the content
        // content.style.overflow = "visible"; // Remove overflow to allow the content to expand
      }
      // setTimeout(() => {
      //     content.style.overflow = "visible"; // Remove overflow to allow the content to expand
      // }, 100); // Delay to allow the transition to take effect
    }
  });
}

const noteFieldCont = document.getElementById("opfloatnotecollapse");
const noteSize = new ResizeObserver((entries) => {
  for (let entry of entries) {
    if (entry.contentRect.width !== noteFieldCont.style.maxWidth) {
      noteFieldCont.style.maxWidth = `${entry.contentRect.width + 15}px`; // Change max width as needed
    }
  }
});

noteSize.observe(document.getElementById("opfloatnote"));

// Perform close operation to start the note collapsed
function toggleNoteMenu() {
  const menu = document.getElementById("opfloat");
  const header = document.getElementById("opfloatheader");
  if (menu.style.maxHeight) {
    menu.style.maxHeight = null;
    menu.style.overflow = null; // Remove overflow to allow the content to expand
  } else {
    menu.style.maxHeight = header.scrollHeight + "px"; // Set a default max height
    menu.style.overflow = "hidden"; // Add overflow to prevent content from expanding
  }
}

toggleNoteMenu(); // Call the function to set the initial state

//////////////////// Script to make the floating menu draggable ////////////////////
dragElement(document.getElementById("opfloat"));

function dragElement(elmnt) {
  let pos1 = 0,
    pos2 = 0,
    pos3 = 0,
    pos4 = 0,
    lastx = 0,
    lasty = 0;
  if (document.getElementById(elmnt.id + "header")) {
    // if present, the header is where you move the DIV from:
    document.getElementById(elmnt.id + "header").onmousedown =
      dragMouseDown;
  } else {
    // otherwise, move the DIV from anywhere inside the DIV:
    elmnt.onmousedown = dragMouseDown;
  }

  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    // get the mouse cursor position at startup:
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // call a function whenever the cursor moves:
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    // calculate the new cursor position:
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;

    // set the element's new position:
    elmnt.style.top = elmnt.offsetTop - pos2 + "px";
    elmnt.style.left = elmnt.offsetLeft - pos1 + "px";
    // pos1 = 0;
    // pos2 = 0; // Reset pos1 and pos2 to 0 after each move
  }

  function closeDragElement() {
    // stop moving when mouse button is released:
    if (
      (parseInt(elmnt.style.left, 10) - lastx === 0 &&
        parseInt(elmnt.style.top, 10) - lasty === 0) ||
      (lastx === 0 && lasty === 0)
    ) {
      toggleNoteMenu(); // Close the note menu if no movement
    }
    // Save the last position unless it has not moved in which case the styles will not have been set
    if (
      !isNaN(parseInt(elmnt.style.left, 10)) &&
      !isNaN(parseInt(elmnt.style.top, 10))
    ) {
      lastx = parseInt(elmnt.style.left, 10);
      lasty = parseInt(elmnt.style.top, 10);
    }
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

const noteButton = document.querySelector("#notebutton");
const inputNote = document.querySelector("#opfloatnote");
const ticker = document.querySelector("#ticker");
noteButton.addEventListener("click", () => {
  const loader = document.querySelector("#opfloatpostnoteloader");
  loader.style.top = "-22px";
  loader.style.opacity = "1"; // Show the loader
  const date = Number(new Date());
  const noteString = `https://1206578.app.netsuite.com/app/crm/common/note.nl?l=T&refresh=usernotes&perm=TRAN_SALESORD&transaction=${orderID}&_ts=${date}`;
  const inputText = inputNote.value.trim();
  const noteFrame = document.createElement("iframe");
  noteFrame.src = noteString;
  noteFrame.id = "opfloatnoteiframe";
  noteFrame.style.position = "fixed";
  noteFrame.style.top = "0";
  // Make the note frame invisible, unless we want to check on what it's doing
  noteFrame.style.display = "none";
  console.log(`Opening comment frame...`)
  document.querySelector("#body").addEventListener("scroll", () => {
    ticker.innerHTML = document.querySelector("#body").scrollTop;
  });
  document.querySelector("[class='uir-record-id']").after(noteFrame);
  document.querySelector("#itemstxt").click();
  const prevScroll = document.querySelector("#body").scrollTop;

  // Works great unless there's some lag - see if we can loop until this works or hit a loop limit?
  const postNote = setInterval(() => {
    console.log("Jiggle");
    document.querySelector("#body").scrollTop++;
    document.querySelector("#body").scrollTop--;
  }, 1500);

  //Wait until document is sufficiently loaded, check for custom flags
  const nodeCheck = VM.observe(document.body, () => {
    // Find the target node
    const node = document.querySelector("#opfloatnoteiframe")/*.contentDocument.querySelector("#note")*/;

    if (node) {
      console.log("Note frame loading...");
      const noteDoc = noteFrame.contentDocument || noteFrame.contentWindow.document;
      // noteDoc.onreadystatechange = () => {
      //   console.log(`State change! State is now ${noteDoc.readyState}`)
      //   if (noteDoc.readyState == "complete") {
      console.log("Note field found, proceeding to add note...");
      const selectType = noteDoc.querySelector("#inpt_notetype_1");
      const noteTextArea = noteDoc.querySelector("#note");
      noteTextArea.value = inputText;
      console.log(`Attempting to add note: ${inputText}`);
      let clicked = false;
      let attempts = 0;

      // Wait for the note to be added
      const complete = setInterval(() => {
        if (!clicked) {
          if (noteDoc.querySelector("#secondarysubmitter").click == null) {
            return;
          } else {
            if (noteDoc.readyState == "complete" || noteDoc.readyState == "interactive") {
              console.log("Clicking submit button");
              noteDoc.querySelector("#secondarysubmitter").click();
              clicked = true; // Prevent multiple clicks
            }
          }
        }
        attempts++;
        if (attempts % 10 == 0) {
          console.log("Resetting click attempt")
          clicked = false; // If we go 5 attempts with no luck, try clicking again
        }
        if (!noteFrame.contentDocument.querySelector("#note")) {
          console.log("Note submitted");
          inputNote.value = ""; // Clear the input field
          loader.style.top = "2px";
          loader.style.opacity = "0"; // Hide the loader
          clearInterval(postNote); // Stop the interval once the node is found
          clearInterval(complete);
          document.querySelector("#opfloatnoteiframe").remove();
        }
      }, 500);
      //   }
      // }


      // disconnect observer
      return true;
    }
  });
});
