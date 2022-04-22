/**
 * Returns the size parameters if they are valid, else returls false.
 * 
 * @returns {number[] | boolean} The size parameters or false
 */
function inspectParams(): number[] | boolean {
    const urlParams = new URLSearchParams(window.location.search);
    const inspectParam = urlParams.get('inspect');
    if (inspectParam) {
        const strParams = inspectParam.split('_');
        if (strParams.length == 3) {
            const numParams = strParams.map(str => Number.parseFloat(str));
            if (numParams.filter(num => Number.isFinite(num) && num > 0).length == 3) {
                return numParams;
            }
        }
    }
    return false;
}

export { inspectParams };