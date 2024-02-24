export enum BitwardenItemType {
  STRING = 0,
  PASSWORD = 1,
}

export class BitwardenItemField {
  'name': string;
  'value': string;
  'type': BitwardenItemType;
}

export class BitwardenItemBase {
  id?: string;
  passwordHistory: Omit<BitwardenKeyItem, 'passwordHistory'>[] = [];
  password: string;
  revisionDate?: string = null;
  creationDate?: string = null;
  deletedDate?: string = null;
  folderId?: string = null;
  organizationId?: string = null;
  collectionIds?: string[] = null;
  name: string;
  notes: string;
  fields: BitwardenItemField[];
  type: number;
  object: 'item' = 'item';
  reprompt: 0 | 1 = 0;
  favorite: boolean = false;
  card?: any = null;
  identity?: any = null;
  secureNote?: any = null;
  login?: any = null;
}

export class BitwardenKeyItem extends BitwardenItemBase {
  type: 2 = 2;
  fields: [
    { name: 'custom-type'; value: 'ssh-key'; type: BitwardenItemType.STRING },
    { name: 'public-key'; value: string; type: BitwardenItemType.STRING },
    { name: 'private-key'; value: string; type: BitwardenItemType.PASSWORD },
  ];
}

export class BitwardenKeyCreateItem extends BitwardenKeyItem {
  id: undefined;
  password: undefined;
  object: undefined = undefined;
}
