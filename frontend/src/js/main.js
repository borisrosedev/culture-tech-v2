
window.addEventListener('DOMContentLoaded', function(){

    /* function body */

    const preAnswer = document.getElementById('pre-answer')
    //const generateButton = document.getElementById('generate-button')
    const stopButton = document.getElementById('stop-button')

    // we define a controller to control the answer stream

    let controller = null 

    // since the end of the answer stream is somewhat random we need a function with options 

    /**
     * 
     * @param {*} data { model: string, prompt: string, options ?: any = {} } 
     */
    async function streamAnswer({ model, prompt , options = {}}){
        if (controller) controller.abort();

        /**
         * The AbortController interface represents a controller object that allows you 
         * to abort one or more Web requests as and when desired.
         */
        controller = new AbortController()
        const { signal } = controller;
        // we need to remove the preAnswer's content when the request is aborted
        preAnswer.textContent = ''

        const serverResponse = await fetch('http://127.0.0.1:11434/api/generate', {
            method: 'POST',
            signal,
            headers: {"Content-Type":"application/json"},
            body: JSON.stringify({
                model, 
                prompt,
                stream: true,
                ...options
            })
        })

        if(!serverResponse.ok || !serverResponse.body) {
            preAnswer.textContent = `HTTP Error ${serverResponse.status}`
        }

        // here is the reading part

        /**
         * The getReader() method of the ReadableStream interface 
         * creates a reader and locks the stream to it.
         */
        const reader = serverResponse.body.getReader()

        /**
         * The TextDecoder interface represents a decoder for a specific text encoding, 
         * such as UTF-8, ISO-8859-2, KOI8-R, GBK, etc.
         */
        const decoder = new TextDecoder()

        let buffer = ''

        try {

            while(true) {
                /**
                 * The read() method of the ReadableStreamDefaultReader interface returns a Promise
                 * providing access to the next chunk in the stream's internal queue.
                 */
                const { value, done } = await reader.read()
            
                if(done) break;

                /**
                 * The TextDecoder.decode() method returns a string containing text 
                 *  decoded from the buffer passed as a parameter.
                 */
                buffer += decoder.decode(value, { stream: true })
                /** Ollama is sending JSON per Line ( JSONL ) so we need to read one line after the other */

                /**
                 * Split a string into substrings using the specified separator 
                 * and return them as an array.
                 */
                  const parts= buffer.split(/\r?\n/);
                /**
                 * Removes the last element from an array and returns it. 
                 * If the array is empty, undefined is returned and the array is not modified.
                 */
                buffer = parts.pop() ?? '';

                for (const raw of parts ){
                     const line = raw.trim();
                    /**
                     * Removes the leading and trailing white space 
                     * and line terminator characters from a string.
                     */
                    if (!line.trim()) continue; // must ignore empty spaces

                    try {
                        const obj = JSON.parse(line)
                        if(obj.response){
                            preAnswer.textContent += obj.response;
                        }
                        if (obj.done || obj.stats) {
                            console.log('End', obj)
                        } 
                    } catch {
                        // if line ... we put it into the buffer 
                        buffer = line + '\n' + buffer 
                    }
                }

            }

            // we decode the rest of it
            const tail = buffer.trim()
            if (tail){
                try {
                    const obj = JSON.parse(buffer);
                    if(obj.response) preAnswer.textContent += obj.response
                } catch {}
              
            }

        } catch (err){
            if(err.name === 'AbortError'){
                preAnswer.textContent += '\n[stream interrupted]'
            } else {
                console.log(err)
                preAnswer.textContent += `\n[error : ${err.message}]`;
            }
        } finally {
            controller = null
        }
    }

    let questionInput = document.getElementById('question-input')
    
    questionInput.addEventListener('keydown', (e) => {

        if(!questionInput.value) return
        if (e.code == "Enter") {
            questionInput = document.getElementById('question-input')
            streamAnswer({
                    model: 'mistral',
                    prompt: questionInput.value
            })
        }
        
    })

    stopButton.addEventListener('click', () => controller.abort())

})

