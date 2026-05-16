exports.miliSecToDays = (miliSec) => {
    const sec = miliSec / 1000
    if(sec <= 0) {
        return 0
    }
    const min = sec / 60

    if(min <= 0) {
        return 0
    }

    const hour = min / 60

    if(hour <= 0) {
        return 0
    }

    const days = hour / 24

    if(days <= 0) {
        return 0
    }

    return days
}

exports.getImagePath = (req) => {
    let publicUrl = process.env.PUBLIC_URL || req.get('host');
    if (publicUrl.includes('://')) {
        return publicUrl + '/images';
    }
    return req.protocol + '://' + publicUrl + '/images';
}

exports.responseFormat = (data, success = true, status = 200, message = "") => {
    return {
        success,
        status,
        message,
        data
    }
}