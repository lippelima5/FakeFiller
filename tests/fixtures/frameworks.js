import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createApp, ref } from 'vue';
import 'zone.js';
import '@angular/compiler';
import { Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
function ReactForm() {
  const [email, setEmail] = useState('');
  return React.createElement(
    'form',
    { id: 'react-form' },
    React.createElement(
      'label',
      null,
      'React email',
      React.createElement('input', {
        id: 'react-email',
        type: 'email',
        value: email,
        onChange: (e) => setEmail(e.target.value),
      }),
    ),
    React.createElement('output', { id: 'react-output' }, email),
  );
}
createRoot(document.getElementById('react')).render(React.createElement(ReactForm));
createApp({
  setup() {
    return { email: ref('') };
  },
  template:
    '<form id="vue-form"><label>Vue email<input id="vue-email" type="email" v-model="email"></label><output id="vue-output">{{email}}</output></form>',
}).mount('#vue');
class AngularForm {
  email = '';
  update(event) {
    this.email = event.target.value;
  }
}
Component({
  selector: 'qa-angular',
  standalone: true,
  template:
    '<form id="angular-form"><label>Angular email<input id="angular-email" type="email" [value]="email" (input)="update($event)"></label><output id="angular-output">{{email}}</output></form>',
})(AngularForm);
bootstrapApplication(AngularForm).catch((e) => {
  document.getElementById('angular-error').textContent = String(e);
});
const masked = document.getElementById('masked-cpf');
masked.addEventListener('input', () => {
  const d = masked.value.replace(/\D/g, '').slice(0, 11);
  masked.value = d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  document.getElementById('mask-output').textContent = masked.value;
});
document.addEventListener('input', () =>
  setTimeout(() => {
    for (const framework of ['react', 'vue', 'angular']) {
      const input = document.getElementById(framework + '-email'),
        output = document.getElementById(framework + '-output');
      document.getElementById(framework + '-verification').textContent =
        input?.value && input.value === output?.textContent
          ? `${framework}: estado sincronizado`
          : `${framework}: aguardando preenchimento`;
    }
  }, 0),
);
