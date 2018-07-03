const $_documentContainer = document.createElement('template');
$_documentContainer.setAttribute('style', 'display: none;');

$_documentContainer.innerHTML = `<dom-module id="factotum-shared-styles">
  <template>
    <style>
      :host {
        --primary-color: var(--paper-blue-700);
        --light-primary-color: var(--paper-blue-100);
        --dark-primary-color: var(--paper-blue-900);
        --secondary-color: var(--paper-grey-700);
        --light-secondary-color: var(--paper-grey-300);
        --dark-secondary-color: var(--paper-grey-900);
        --accent-color: var(--paper-blue-a200);
        --light-accent-color: var(--paper-blue-a100);
        --dark-accent-color: var(--paper-blue-a400);

        --primary-text-color: #ffffff;
        --primary-background-color: var(--primary-color);
        --secondary-background-color: #ffffff;
        --secondary-text-color: #000000;
        --disabled-text-color: #9b9b9b;
        --divider-color: #dbdbdb;
        --error-color: var(--paper-deep-orange-a700);

        @apply --paper-font-common-base;
      }

      app-header {
        color: var(--primary-text-color);
        background-color: var(--primary-background-color);
      }

      tr.stripeRow:nth-child(odd) {
        background-color: var(--light-primary-color);
      }
    </style>
  </template>
</dom-module>`;

document.head.appendChild($_documentContainer.content);
