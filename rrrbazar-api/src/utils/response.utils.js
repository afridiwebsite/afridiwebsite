export default class {
    data = {};
    success = true;
    status = 200;
    message = '';
    action = '';

    getResponse() {
        return {
            'success': this.success,
            'status': this.status,
            'message': this.message,
            'action': this.action,
            'data': this.data
        }
    }

    get responseConst() {
        return {
            logout: 'logout'
        }
    }

    get internalError() {
        return {
            'success': false,
            'status': 400,
            'message': this.message || 'Internal Error',
            'action': this.action,
            'data': {}
        }
    }

    get response() {
        return {
            'success': this.success,
            'status': this.status,
            'message': this.message,
            'action': this.action,
            'data': this.data
        }
    }
}