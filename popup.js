function loadGlobalsThenExecute(tabId, secondaryScript) {
  chrome.scripting.executeScript(
    {
      target: { tabId: tabId },
      files: ["globals.js"],
    },
    () => {
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: [secondaryScript],
      });
    }
  );
}

function addButtonListener(buttonId, scriptName) {
  document.getElementById(buttonId).addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab) {
        loadGlobalsThenExecute(tab.id, scriptName);
      }
    });
  });
}

function initializeButtons() {
  addButtonListener("add-checkboxes", "addCheckboxes.js");
  addButtonListener("bulk-delete", "bulkDeleteConversations.js");
  addButtonListener("toggle-checkboxes", "toggleCheckboxes.js");
  addButtonListener("remove-checkboxes", "removeCheckboxes.js");

  const bulkArchiveButton = document.getElementById("bulk-archive");
  bulkArchiveButton.addEventListener("click", handleBulkArchive);
}

const storageKey = "BulkDeleteChatGPT_isPaid";
async function checkMembershipStatus() {
  const localIsPaid = localStorage.getItem(storageKey) === "true";

  updateBulkArchiveButton(localIsPaid);

  const userInfo = await getUserInfo();
  if (!userInfo) {
    console.error("Unable to get user info");
    return;
  }

  try {
    const response = await fetch(
      `https://bulk-delete-chatgpt-worker.qcrao.com/check-payment-status?user_id=${encodeURIComponent(
        userInfo.id
      )}`
    );
    const data = await response.json();

    // 更新本地存储和按钮状态
    localStorage.setItem(storageKey, data.isPaid);
    updateBulkArchiveButton(data.isPaid);
  } catch (error) {
    console.error("Error checking membership status:", error);
  }
}

function updateBulkArchiveButton(isPaid) {
  const bulkArchiveButton = document.getElementById("bulk-archive");
  if (isPaid) {
    bulkArchiveButton.classList.remove("locked");
    bulkArchiveButton.querySelector("span").textContent = "";
  } else {
    bulkArchiveButton.classList.add("locked");
    bulkArchiveButton.querySelector("span").textContent = "🔒";
  }
}

async function handleBulkArchive() {
  const localIsPaid = localStorage.getItem(storageKey) === "true";
  if (localIsPaid) {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["bulkArchiveConversations.js"],
        });
      }
    });
    return;
  }

  const userInfo = await getUserInfo();
  if (!userInfo) {
    console.error("Unable to get user info");
    alert("Unable to verify user. Please try again later.");
    return;
  }

  const response = await fetch(
    `https://bulk-delete-chatgpt-worker.qcrao.com/check-payment-status?user_id=${encodeURIComponent(
      userInfo.id
    )}`
  );
  const data = await response.json();

  if (data.isPaid) {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["bulkArchiveConversations.js"],
        });
      }
    });
  } else {
    showModal().then(async (result) => {
      if (result) {
        const payResponse = await fetch(
          `https://bulk-delete-chatgpt-worker.qcrao.com/pay-bulk-archive?user_id=${encodeURIComponent(
            userInfo.id
          )}`,
          { method: "POST" }
        );
        const payData = await payResponse.json();
        console.log("payData", payData);
        if (payData.paymentUrl) {
          window.open(payData.paymentUrl, "_blank");
        } else {
          alert("Failed to get payment link. Please try again later.");
        }
      }
    });
  }
}

function showModal() {
  return new Promise((resolve) => {
    const modal = document.getElementById("customModal");
    const okButton = document.getElementById("modalOK");
    const cancelButton = document.getElementById("modalCancel");

    modal.style.display = "block";

    okButton.onclick = () => {
      modal.style.display = "none";
      resolve(true);
    };

    cancelButton.onclick = () => {
      modal.style.display = "none";
      resolve(false);
    };

    window.onclick = (event) => {
      if (event.target == modal) {
        modal.style.display = "none";
        resolve(false);
      }
    };
  });
}

function updateCopyrightYear() {
  const currentYear = new Date().getFullYear();
  document.getElementById(
    "copyright"
  ).innerHTML = `&copy; ${currentYear} <a href="https://github.com/qcrao/bulk-delete-chatGPT" target="_blank">qcrao@GitHub</a>`;
}

document.addEventListener("DOMContentLoaded", function () {
  initializeButtons();
  updateCopyrightYear();
  checkMembershipStatus();
});

// 每次打开popup时检查会员状态
chrome.runtime.onConnect.addListener(function (port) {
  if (port.name === "popup") {
    port.onDisconnect.addListener(function () {
      checkMembershipStatus();
    });
  }
});
