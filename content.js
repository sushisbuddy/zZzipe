let currentAmount = 0;
let isInstantTradeOpen = false;

let lastInstantTradeCheck = 0;
const INSTANT_TRADE_CHECK_INTERVAL = 500;

chrome.storage.local.get(['buyAmount'], function(result) {
  if (result.buyAmount !== undefined) {
    currentAmount = result.buyAmount;
    updateAllButtons();
    updateAllInputs();
  }
});

const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(5px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes expandWidth {
    from {
      width: 44px;
    }
    to {
      width: 74px;
    }
  }

  .custom-flower-button {
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .custom-flower-button:hover {
    transform: scale(1.02);
    box-shadow: 0 0 10px rgba(106, 172, 247, 0.3);
  }

  .custom-flower-button.hover-variant {
    opacity: 0;
  }

  .pump-card-hover:hover .custom-flower-button.hover-variant {
    animation: fadeIn 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards,
              expandWidth 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }
`;
document.head.appendChild(style);

function isDiscordPage() {
  return window.location.hostname.includes('discord.com');
}

function isMainPage() {
  return window.location.pathname === '/';
}

function getTokenAddressFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('address');
}

function needsInstantTradeCheck() {
  const now = Date.now();
  if (now - lastInstantTradeCheck >= INSTANT_TRADE_CHECK_INTERVAL) {
    lastInstantTradeCheck = now;
    return true;
  }
  return false;
}

function checkInstantTrade() {
  const instantTradeButton = document.querySelector('label[for="one-click"]');
  if (instantTradeButton) {
    isInstantTradeOpen = instantTradeButton.classList.contains('bg-green-900');
    return isInstantTradeOpen;
  }
  return false;
}

function createCustomInput() {
  const wrapper = document.createElement('div');
  wrapper.className = 'ant-input-number-wrapper ant-input-number-group custom-input';
  wrapper.style.cssText = `
    border: 1px solid rgb(106, 172, 247); 
    background-color: rgb(13, 13, 16);
    width: 100%;
    height: 100%;
  `;

  wrapper.innerHTML = `
    <div class="ant-input-number-group-addon" style="background-color: rgb(13, 13, 16); border-color: rgb(106, 172, 247);">
      <div class="flex items-center">
        <span class="text-pink-400 text-xs font-medium ml-1">💤 Buy</span>
      </div>
    </div>
    <div class="ant-input-number-affix-wrapper ant-input-number-affix-wrapper-without-controls ant-input-number-outlined" style="background-color: rgb(13, 13, 16); border-color: rgb(106, 172, 247);">
      <div class="ant-input-number">
        <div class="ant-input-number-input-wrap">
          <input autocomplete="off" role="spinbutton" aria-valuenow="0" step="any" min="0" placeholder="0.0" class="ant-input-number-input custom-amount-input" type="number" value="${currentAmount}" style="background-color: rgb(13, 13, 16); color: rgb(106, 172, 247);">
        </div>
      </div>
      <span class="ant-input-number-suffix">
        <span class="text-pink-400">◎</span>
      </span>
    </div>
  `;

  const input = wrapper.querySelector('.custom-amount-input');

  input.addEventListener('input', (e) => {
    const value = e.target.value;
    if (!isNaN(value) && parseFloat(value) >= 0) {
      currentAmount = parseFloat(value) || 0;
      chrome.storage.local.set({ buyAmount: currentAmount });
      updateAllButtons();
    }
  });

  return wrapper;
}

const createdButtons = new WeakMap();

function createDiscordButton() {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'pdiddy discord-buy-button';
  button.style.cssText = `
    border: 1px solid rgb(106, 172, 247);
    margin: 0px 4px;
    background-color: rgb(13, 13, 16);
    padding: 2px 6px;
    font-size: 12px;
    height: 24px;
    line-height: 1;
    cursor: pointer;
    border-radius: 4px;
    display: inline-flex;
    align-items: center;
    vertical-align: middle;
    color: rgb(106, 172, 247);
  `;
  button.textContent = `💤 1 ◎`;
  return button;
}

function addDiscordBuyButtons() {
  if (!isDiscordPage()) return;

  const textElements = document.querySelectorAll(`
    code, 
    .embedDescription_b0068a, 
    .message-content,
    .markup_f8f345,
    pre code,
    .embedDescription_b0068a pre,
    .blockquoteContainer_f8f345
  `);

  textElements.forEach(element => {
    if (element.dataset.processedForTokens) return;

    const tokenRegex = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g;
    
    const text = element.childNodes.length > 0 ? 
      Array.from(element.childNodes)
        .filter(node => node.nodeType === Node.TEXT_NODE)
        .map(node => node.textContent)
        .join('') :
      element.textContent;

    let match;
    let lastIndex = 0;
    const fragment = document.createDocumentFragment();

    while ((match = tokenRegex.exec(text)) !== null) {
      const tokenAddress = match[0];
      const matchIndex = match.index;

      if (matchIndex > lastIndex) {
        fragment.appendChild(
          document.createTextNode(text.slice(lastIndex, matchIndex))
        );
      }

      const wrapper = document.createElement('span');
      wrapper.style.cssText = `
        display: inline-flex;
        align-items: center;
        gap: 4px;
        white-space: nowrap;
        vertical-align: middle;
        background: rgba(13, 13, 16, 0.6);
        padding: 2px;
        border-radius: 4px;
      `;

      const addressText = document.createElement('span');
      addressText.textContent = tokenAddress;
      addressText.style.fontFamily = 'monospace';

      const buyButton = createDiscordButton();
      buyButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleButtonClick(e, 'buy', tokenAddress);
      });

      wrapper.appendChild(addressText);
      wrapper.appendChild(buyButton);
      fragment.appendChild(wrapper);

      lastIndex = matchIndex + tokenAddress.length;
    }

    if (lastIndex < text.length) {
      fragment.appendChild(
        document.createTextNode(text.slice(lastIndex))
      );
    }

    if (lastIndex > 0) {
      element.textContent = '';
      element.appendChild(fragment);
    }

    element.dataset.processedForTokens = 'true';
  });
}

function createHoverButton(parentElement) {
  if (parentElement.querySelector('.custom-flower-button.hover-variant')) {
    return;
  }

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'pdiddy ant-btn ant-btn-text custom-flower-button hover-variant';
  button.style.cssText = `
    border: 1px solid rgb(106, 172, 247);
    margin: 0px 4px;
    z-index: 1000;
    background-color: rgb(13, 13, 16);
    padding: 2px 6px;
    font-size: 12px;
    height: 32px;
    line-height: 1;
    cursor: pointer;
    opacity: 0;
    width: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(4px);
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
  `;
  
  const textWrapper = document.createElement('div');
  textWrapper.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: center;
    white-space: nowrap;
  `;
  textWrapper.textContent = `💤 ${currentAmount} ◎`;
  button.appendChild(textWrapper);
  
  button.addEventListener('click', handleButtonClick);
  return button;
}

function isElementVisible(element) {
  if (!element || !element.isConnected) return false;
  
  const rect = element.getBoundingClientRect();
  const isInViewport = (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
  
  const style = window.getComputedStyle(element);
  return isInViewport && 
         style.display !== 'none' && 
         style.visibility !== 'hidden' && 
         parseFloat(style.opacity) > 0;
}

function createNewButton() {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'pdiddy ant-btn ant-btn-text custom-flower-button';
  button.style.cssText = `
    border: 1px solid rgb(106, 172, 247);
    margin: 0px 4px;
    z-index: 1000;
    background-color: rgb(13, 13, 16);
    padding: 2px 6px;
    font-size: 12px;
    height: 24px;
    line-height: 1;
    cursor: pointer;
  `;
  button.textContent = `💤 ${currentAmount} ◎`;
  return button;
}

function cleanupRemovedNodes(removedNodes) {
  for (const node of removedNodes) {
    if (node.nodeType === Node.ELEMENT_NODE) {

      if (node.classList?.contains('pump-card')) {
        const customButton = node.querySelector('.custom-flower-button');
        if (customButton) {
          customButton.remove();
          createdButtons.delete(node);
        }
      }
      
      const customButtons = node.querySelectorAll('.custom-flower-button');
      customButtons.forEach(button => {
        button.remove();
        const parentCard = button.closest('.pump-card');
        if (parentCard) {
          createdButtons.delete(parentCard);
        }
      });
    }
  }
}

function createBuyButton(amount) {
  const button = document.createElement('button');
  button.className = 'pdiddy border rounded h-[28px] text-xs font-medium flex items-center justify-center custom-buy-button';
  button.style.cssText = `
    border: 1px solid rgb(106, 172, 247);
    background-color: rgb(13, 13, 16);
    padding: 2px 6px;
    cursor: pointer;
    color: rgb(106, 172, 247);
  `;
  button.textContent = `${amount} ◎`;
  button.setAttribute('data-amount', amount); // Store the amount in the button
  button.addEventListener('click', (e) => handleButtonClick(e, 'buy'));
  return button;
}

function createSellButton(percentage) {
  const button = document.createElement('button');
  button.className = 'border rounded h-[28px] text-xs font-medium bg-grey-800 hover:text-grey-900 flex items-center justify-center text-red-600 border-red-600 hover:bg-red-600 custom-sell-button';
  button.style.cssText = `
    border: 1px solid rgb(255, 0, 66);
    background-color: rgb(13, 13, 16);
    padding: 2px 6px;
    cursor: pointer;
    color: rgb(255, 0, 66);
  `;
  button.setAttribute('data-percentage', percentage);
  button.textContent = `${percentage}%`;
  button.addEventListener('click', (e) => handleButtonClick(e, 'sell'));
  return button;
}

function updateAllButtons() {
  const buttons = document.querySelectorAll('.custom-flower-button');
  buttons.forEach(button => {
    if (button.childNodes.length > 0 && button.childNodes[0].nodeType === Node.ELEMENT_NODE) {
      button.childNodes[0].textContent = `💤 ${currentAmount} ◎`;
    } else {
      button.textContent = `💤 ${currentAmount} ◎`;
    }
  });
}

function updateAllInputs() {
  const inputs = document.querySelectorAll('.custom-amount-input');
  inputs.forEach(input => {
    input.value = currentAmount;
  });
}

function handleButtonClick(event, side = 'buy', providedTokenAddress = null) {
  const button = event.target.closest('button');
  let tokenAddress = providedTokenAddress;
  let amount;
  
  if (!tokenAddress) {
    if (isMainPage()) {
      const parentElement = button.closest('.trades-row') || button.closest('.pump-card-hover');
      if (!parentElement) return;
      
      const imageElement = parentElement.querySelector('img[src*="bullx.io"]');
      if (!imageElement) return;
      
      tokenAddress = extractTokenAddress(imageElement.src);
    } else {
      tokenAddress = getTokenAddressFromUrl();
    }
  }

  if (tokenAddress) {
    if (side === 'buy') {
      if (button.classList.contains('custom-buy-button')) {
        amount = parseFloat(button.getAttribute('data-amount'));
      } else if (button.classList.contains('discord-buy-button')) {
        amount = 1;
      } else {
        amount = currentAmount;
      }
    } else {

      amount = parseFloat(button.getAttribute('data-percentage'));
    }

    chrome.runtime.sendMessage(
      { 
        action: 'sendSwapRequest', 
        tokenAddress: tokenAddress,
        amount: amount,
        side: side
      },
      response => {
        if (response.success) {
          button.style.backgroundColor = 'rgb(20, 83, 45)';
          setTimeout(() => {
            button.style.backgroundColor = button.classList.contains('custom-sell-button') ? '' : 'rgb(13, 13, 16)';
          }, 1000);
        } else {
          button.style.backgroundColor = 'rgb(83, 20, 20)';
          setTimeout(() => {
            button.style.backgroundColor = button.classList.contains('custom-sell-button') ? '' : 'rgb(13, 13, 16)';
          }, 1000);
        }
      }
    );
  }
}

function extractTokenAddress(imageUrl) {
  const match = imageUrl.match(/\/([^\/]+)\?/);
  return match ? match[1] : null;
}

function replaceInstantTradeButtons() {
  if (!checkInstantTrade()) return;

  const container = document.querySelector('.one-click-container');
  if (!container) return;

  const sections = container.querySelectorAll('.flex.flex-col.gap-y-2');
  sections.forEach(section => {
    const label = section.querySelector('.text-sm.font-medium.text-grey-100');
    if (!label) return;

    const buttonsGrid = section.querySelector('.grid');
    if (!buttonsGrid) return;

    if (label.textContent === 'Buy') {
      const buttons = buttonsGrid.querySelectorAll('button:not(.pdiddy)');
      buttons.forEach(button => {
        if (!button.isConnected || !button.parentNode) return;
        const amount = parseFloat(button.textContent);
        if (!isNaN(amount)) {
          const newButton = createBuyButton(amount);
          button.parentNode.replaceChild(newButton, button);
        }
      });
    } else if (label.textContent === 'Sell') {
      const buttons = buttonsGrid.querySelectorAll('button:not(.custom-sell-button)');
      buttons.forEach(button => {
        if (!button.isConnected || !button.parentNode) return;
        const percentage = parseInt(button.textContent);
        if (!isNaN(percentage)) {
          const newButton = createSellButton(percentage);
          button.parentNode.replaceChild(newButton, button);
        }
      });
    }
  });
}

function replaceButtons() {
  if (!isMainPage()) return;
  
  document.querySelectorAll('button.ant-btn:not(.pdiddy)').forEach(button => {
    if (!button.isConnected || !isElementVisible(button)) return;
    if (!button.querySelector('svg')) return;

    const isInstantTrade = button.closest('.one-click-container');
    const pumpCard = button.closest('.pump-card-hover');
    const tradesRow = button.closest('.trades-row');
    
    if (isInstantTrade || pumpCard || tradesRow) {
      if (pumpCard && !pumpCard.dataset.hoverListenerAdded) {
        const originalButton = pumpCard.querySelector('button.ant-btn:not(.pdiddy)');
        if (originalButton) {
          originalButton.classList.add('custom-flower-button', 'hover-variant');
          
          pumpCard.addEventListener('mouseenter', () => {
            if (originalButton.isConnected) {
              originalButton.innerHTML = `💤 ${currentAmount} ◎`;
              originalButton.style.cssText = `
                border: 1px solid rgb(106, 172, 247);
                margin: 0px 4px;
                z-index: 1000;
                background-color: rgb(13, 13, 16);
                padding: 2px 6px;
                font-size: 12px;
                height: 32px;
                line-height: 1;
                cursor: pointer;
                width: 74px;
                display: flex;
                align-items: center;
                justify-content: center;
                backdrop-filter: blur(4px);
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
              `;
            }
          });
          
          pumpCard.addEventListener('mouseleave', () => {
            if (originalButton.isConnected) {
              originalButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none" class="text-sm"><path d="M9.5 4.50284H7V1.50284C7 1.35284 6.9 1.20284 6.8 1.10284C6.6 0.952842 6.25 1.00284 6.1 1.20284L2.1 6.70284C2.05 6.80284 2 6.90284 2 7.00284C2 7.30284 2.2 7.50284 2.5 7.50284H5V10.5028C5 10.8028 5.2 11.0028 5.5 11.0028C5.65 11.0028 5.8 10.9028 5.9 10.8028L9.9 5.30284C9.95 5.20284 10 5.10284 10 5.00284C10 4.70284 9.8 4.50284 9.5 4.50284Z" fill="url(#paint0_linear_16268_24639)"></path><defs><linearGradient id="paint0_linear_16268_24639" x1="2" y1="1.01562" x2="11.3474" y2="2.31246" gradientUnits="userSpaceOnUse"><stop stop-color="#10EFAA"></stop><stop offset="1" stop-color="#D528FC"></stop></linearGradient></defs></svg><span class="text-grey-100 font-medium !hidden opacity-0 group-hover:!inline-block group-hover:opacity-100">$0</span>`;
              originalButton.style.cssText = button.getAttribute('style') || '';
            }
          });

          originalButton.addEventListener('click', handleButtonClick);
        }
        
        pumpCard.dataset.hoverListenerAdded = 'true';
      }
      
      if ((isInstantTrade || tradesRow) && !button.classList.contains('pdiddy')) {
        const newButton = createNewButton();
        if (newButton) {
          newButton.addEventListener('click', handleButtonClick);
          button.parentNode.replaceChild(newButton, button);
        }
      }
    }
  });
}

function replaceInputs() {
  if (!isMainPage()) return;
  
  const groupWrappers = document.querySelectorAll('.ant-input-number-group-wrapper:not(.custom-input-wrapper):not(.new-pair-preset-sm)');
  groupWrappers.forEach(wrapper => {

    if (!wrapper.isConnected || !wrapper.parentNode) return;

    if (!wrapper.classList.contains('custom-input-wrapper')) {
      const newWrapper = document.createElement('div');
      newWrapper.className = wrapper.className + ' custom-input-wrapper';
      newWrapper.classList.remove('bg-grey-700');
      newWrapper.style.cssText = `
        background-color: rgb(13, 13, 16);
        border: 1px solid rgb(106, 172, 247);
        border-radius: 4px;
        overflow: hidden;
      `;
      
      const newInput = createCustomInput();
      newWrapper.appendChild(newInput);

      if (wrapper.parentNode) {
        wrapper.parentNode.replaceChild(newWrapper, wrapper);
      }
    }
  });
}

const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const debouncedReplace = debounce(() => {
  requestAnimationFrame(() => {
    replaceButtons();
    replaceInputs();
  });
}, 100);

const cleanupObserver = new MutationObserver((mutations) => {
  mutations.forEach(mutation => {
    mutation.removedNodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const customButtons = node.querySelectorAll('.custom-flower-button');
        customButtons.forEach(button => button.remove());

        if (node.classList?.contains('pump-card-hover')) {
          delete node.dataset.hoverListenerAdded;
        }
      }
    });
  });
});

cleanupObserver.observe(document.body, {
  childList: true,
  subtree: true
});

const observerCallback = (mutations) => {
  let shouldUpdate = false;
  
  for (const mutation of mutations) {
    if (!mutation.target.isConnected) continue;

    if (mutation.type === 'childList') {
      const hasRelevantNodes = Array.from(mutation.addedNodes).some(node => {
        if (node.nodeType !== 1) return false;
        const isRelevant = node.matches?.('.ant-input-number-group-wrapper, .ant-btn, .one-click-container') ||
                          node.querySelector?.('.ant-input-number-group-wrapper, .ant-btn, .one-click-container');
        return isRelevant && isElementVisible(node);
      });
      
      if (hasRelevantNodes) {
        shouldUpdate = true;
        break;
      }
    }
  }
  
  if (shouldUpdate || needsInstantTradeCheck()) {
    if (isMainPage()) {
      debouncedReplace();
    }
    replaceInstantTradeButtons();
  }
};

const discordObserver = new MutationObserver((mutations) => {
  let shouldUpdate = false;
  
  for (const mutation of mutations) {
    if (mutation.type === 'childList' && 
        (mutation.target.classList.contains('chat-content') || 
         mutation.target.classList.contains('message-content') ||
         mutation.target.classList.contains('embedDescription_b0068a') ||
         mutation.target.classList.contains('markup_f8f345') ||
         mutation.target.classList.contains('grid_b0068a') ||
         mutation.target.closest('.embedDescription_b0068a') ||
         mutation.target.closest('.markup_f8f345'))) {
      shouldUpdate = true;
      break;
    }
  }
  
  if (shouldUpdate) {
    requestAnimationFrame(() => {
      addDiscordBuyButtons();
    });
  }
});

const observer = new MutationObserver(observerCallback);

let urlCheckInterval;
function startUrlMonitoring() {
  let lastUrl = window.location.href;
  
  if (urlCheckInterval) {
    clearInterval(urlCheckInterval);
  }
  
  urlCheckInterval = setInterval(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      if (isMainPage()) {
        debouncedReplace();
      }
      replaceInstantTradeButtons();
    }
    
    if (needsInstantTradeCheck()) {
      replaceInstantTradeButtons();
    }
  }, 250);
}

startUrlMonitoring();

if (isDiscordPage()) {
  discordObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
  addDiscordBuyButtons();
} else {
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class']
  });
  
  requestAnimationFrame(() => {
    replaceButtons();
    replaceInputs();
    replaceInstantTradeButtons();
  });
}