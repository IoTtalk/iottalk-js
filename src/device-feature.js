import { ArgumentError } from './exceptions';

export default class {
  constructor(params) {
    this.DFName = params.DFName;
    if (!this.DFName) {
      throw new ArgumentError('device feature name is required.');
    }

    this.df_type = params.df_type; // idf | odf
    if (this.df_type !== 'idf' && this.df_type !== 'odf') {
      throw new ArgumentError(`${this.DFName} df_type must be "idf" or "odf"`);
    }

    this.paramType = params.paramType || [null];

    this.onData = null;
    if (params.df_type === 'odf' && params.onData) this.onData = params.onData;

    this.pushData = null;
    if (params.df_type === 'idf' && params.pushData) this.pushData = params.pushData;
  }
}
