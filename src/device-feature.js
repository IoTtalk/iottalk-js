import { ArgumentError } from './exceptions.js'
export default class {

    constructor(params) {
        this.df_name = params['df_name'];
        if (!this.df_name) {
            throw new ArgumentError('device feature name is required.');
        }

        this.df_type = params['df_type'];  // idf | odf
        this.param_type = params['param_type'] || [null];

        this.on_data = null
        if (params['df_type'] == 'odf' && params['on_data'])
            this.on_data = params['on_data'];

        this.push_data = null
        if (params['df_type'] == 'idf' && params['push_data'])
            this.push_data = params['push_data'];
    }
}
