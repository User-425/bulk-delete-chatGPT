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

async function checkMembershipStatus() {
  const userInfo = await getUserInfo();
  if (!userInfo) {
    console.error("Unable to get user info");
    updateBulkArchiveButton(false);
    return;
  }

  try {
    const response = await fetch(
      `https://bulk-delete-chatgpt-worker.qcrao.com/check-payment-status?user_id=${encodeURIComponent(
        userInfo.id
      )}`
    );
    const data = await response.json();
    updateBulkArchiveButton(data.isPaid);
  } catch (error) {
    console.error("Error checking membership status:", error);
    updateBulkArchiveButton(false);
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
    if (confirm("一次性付费 0.99 USD，购买权限。是否继续？")) {
      const payResponse = await fetch(
        `https://bulk-delete-chatgpt-worker.qcrao.com/pay-bulk-archive?user_id=${encodeURIComponent(
          userInfo.id
        )}`,
        {
          method: "POST",
        }
      );
      const payData = await payResponse.json();
      console.log("payData", payData);
      if (payData.paymentUrl) {
        window.open(payData.paymentUrl, "_blank");
      } else {
        alert("获取支付链接失败，请稍后再试。");
      }
    }
  }
}

function getUserInfo() {
  return new Promise((resolve) => {
    chrome.identity.getProfileUserInfo({ accountStatus: "ANY" }, (userInfo) => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        resolve(null);
      } else {
        resolve(userInfo);
      }
    });
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
