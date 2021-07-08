import fs from 'fs'

export const fileSystem = {
    findFiles: async (path: string) => {
        return new Promise((resolve, reject) => {
          fs.readdir(path, (err, response) => {
            if (err) {
                reject(err)
            }
            resolve(response)
          })
        })
      },
      /**
      * Read a file
      * @param {String} file Path to the file
      */
      read: async (file: string): Promise<string> => {
        return new Promise((resolve, reject) => {
          fs.readFile(file, 'utf8', (err, response) => {
            if (err) {
                reject(err)
            }
            resolve(response)
          })
        })
      },
      /**
      * Write string to a file (Replaces old one)
      * @param {String} file Path to the file
      * @param {String} string String to append to the file
      */
      write: async (file: string, string: string): Promise<void> => {
        return new Promise((resolve, reject) => {
          fs.writeFile(file, string, 'utf8', (err) => {
            if (err) {
                reject(err)
            }
            resolve()
          })
        })
      }
}
