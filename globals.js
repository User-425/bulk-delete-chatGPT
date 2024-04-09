if (typeof window.globalsLoaded === 'undefined') {
    console.log('globals.js loaded');

    window.globalsLoaded = true;

    let lastChecked = null;

    let Selectors = {
        // Plus 用户的选择器
        conversationsCheckbox: '.conversation-checkbox:checked',
        deleteButton: '[class*="text-red"]',
        confirmDeleteButton: 'button.btn.btn-danger',
        threeDotButton: '[id^="radix-"]',
        // 其他 Plus 用户选择器...
        CONVERSATION_SELECTOR: 'div > div > div > div > div > div > nav > div > div > div > div > ol > li > div > a',
        TITLE_SELECTOR: '.relative.grow.overflow-hidden.whitespace-nowrap',
    };

    let CHECKBOX_CLASS = 'conversation-checkbox';

    window.lastChecked = lastChecked;
    window.Selectors = Selectors;
    window.CHECKBOX_CLASS = CHECKBOX_CLASS;
} else {
    console.log('globals.js already loaded, skipping re-initialization');
}