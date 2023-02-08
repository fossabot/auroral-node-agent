/**
 * Validate types of given variables
 */

export const _ = {
    isObject: (x: any): boolean => {
        return Object.prototype.toString.call(x) === '[object Object]'
    },
    isJSON: (x: any): boolean => {
        try {
            JSON.parse(x)
            return true
        } catch (err: unknown) {
            return false
        }
    },
    isArray: (x: any): boolean => {
        return Object.prototype.toString.call(x) === '[object Array]'
    },
    isString: (x: any): boolean => {
        return Object.prototype.toString.call(x) === '[object String]'
    }
}
