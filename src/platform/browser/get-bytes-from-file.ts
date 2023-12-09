 export async function getBytesFromFile(file: File|Blob): Promise<Uint8Array> {
    const fileData = new Blob([file], { type: file.type })

    const reader = new FileReader()

    const onReaderLoad = new Promise<void>((res, rej) => {
      reader.onload = () => res()
      reader.onerror = (e) => rej(e)
    })        
    
    reader.readAsArrayBuffer(fileData)

    await onReaderLoad

    var arrayBuffer = reader.result
    if (!(arrayBuffer instanceof ArrayBuffer)) {
        throw new Error('failed to load file')
    }

    const arr = new Uint8Array(arrayBuffer)
    return arr
}
