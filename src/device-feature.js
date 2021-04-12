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

    this.param_type = params.param_type || [null];

    this.on_data = null;
    if (params.df_type === 'odf' && params.on_data) this.on_data = params.on_data;

    this.pushData = null;
    if (params.df_type === 'idf' && params.pushData) this.pushData = params.pushData;
  }
}
