window.addEventListener('DOMContentLoaded', function(){

/* function body */

    /**
     * Send a http to my server
     * @param {*} event 
     */
    function onSubmit(event) {
        event.preventDefault()
        const questionInput = document.getElementById('question-input')

        fetch('http://localhost:11434/api/generate ', {
           method: "POST",
           headers: { "Content-Type":"application/json" },
           body: JSON.stringify({
                model: "mistral",
                prompt: questionInput.value
           }) 
        })
    }

    const form = document.getElementById('search-form')

    form.addEventListener('submit', onSubmit)

})

