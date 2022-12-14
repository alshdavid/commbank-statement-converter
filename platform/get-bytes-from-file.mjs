/**
 * 
 * @param {File|Blob} file 
 * @returns 
 */
 export async function getBytesFromFile(file) {
    const fileData = new Blob([file])
    const reader = new FileReader()
    const onReaderLoad = new Promise(res => reader.onload = res)        
    reader.readAsArrayBuffer(fileData)

    await onReaderLoad
    var arrayBuffer = reader.result
    if (!(arrayBuffer instanceof ArrayBuffer)) {
        throw new Error('failed to load file')
    }

    const arr = new Uint8Array(arrayBuffer)
    return arr
}
