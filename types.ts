export const kinds = [
  'fullName',
  'firstName',
  'lastName',
  'cpf',
  'cns',
  'cnpj',
  'rg',
  'phone',
  'mobile',
  'email',
  'birthDate',
  'age',
  'cep',
  'street',
  'houseNumber',
  'district',
  'city',
  'state',
  'address',
  'username',
  'password',
  'uuid',
  'uid',
  'ulid',
  'token',
  'date',
  'number',
  'money',
  'text',
  'url',
  'company',
] as const;
export type Kind = (typeof kinds)[number];
export type Mode = 'smart' | 'random' | 'custom';
export type Scope = 'all' | 'form' | 'input';
export type Action = 'fill' | 'random' | 'regenerate' | 'copy' | 'generate';
export interface Rule {
  selector?: string;
  kind?: Kind;
  generator: Kind;
  value?: string;
}
export interface Settings {
  mode: Mode;
  theme: 'system' | 'light' | 'dark';
  formatted: boolean;
  overwrite: boolean;
  rules: Rule[];
}
export const defaults: Settings = {
  mode: 'smart',
  theme: 'system',
  formatted: true,
  overwrite: false,
  rules: [],
};
export interface Request {
  channel: 'fake-filler-dev';
  action: Action;
  scope: Scope;
  settings: Settings;
  target?: 'context' | 'focus';
  kind?: Kind;
}
export interface Result {
  filled: number;
  skipped: number;
  rejected: number;
  values: string[];
  error?: string;
}
export const labels: Record<Kind, string> = {
  fullName: 'Nome completo',
  firstName: 'Nome',
  lastName: 'Sobrenome',
  cpf: 'CPF',
  cns: 'CNS',
  cnpj: 'CNPJ',
  rg: 'RG sintético',
  phone: 'Telefone',
  mobile: 'Celular',
  email: 'E-mail',
  birthDate: 'Nascimento',
  age: 'Idade',
  cep: 'CEP',
  street: 'Rua',
  houseNumber: 'Número do endereço',
  district: 'Bairro',
  city: 'Cidade',
  state: 'Estado',
  address: 'Endereço completo',
  username: 'Username',
  password: 'Senha fictícia',
  uuid: 'UUID',
  uid: 'UID',
  ulid: 'ULID',
  token: 'Token',
  date: 'Data',
  number: 'Número',
  money: 'Valor monetário',
  text: 'Texto',
  url: 'URL',
  company: 'Empresa',
};
