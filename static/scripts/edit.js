let messages = [];

function updatePreview() {
    const html = htmlEditor.getValue();
    const css = cssEditor.getValue();
    const js = jsEditor.getValue();

    let content = html.replace(/<\/(?!\w+>)/g, '');
        
    content = content.replace(/<style do-not-remove>[\s\S]*?<\/style>/, `<style>${css}</style>`);
    content = content.replace(/<script do-not-remove>[\s\S]*?<\/script>/, `<script>${js}</script>`);
    
    const previewFrame = document.getElementById('preview-frame');
    const previewDocument = previewFrame.contentDocument || previewFrame.contentWindow.document;
    previewDocument.open();
    previewDocument.write(content);
    previewDocument.close();
}

function showTab(editor) {
    document.querySelectorAll('.editor-container').forEach(container => container.classList.add('hidden'));
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));

    document.getElementById(editor + '-editor-container').classList.remove('hidden');
    document.getElementById(editor + '-tab').classList.add('active');
    
    if (editor === 'html') htmlEditor?.layout();
    if (editor === 'css') cssEditor?.layout();
    if (editor === 'js') jsEditor?.layout();
}

function saveSite() {
    const html = htmlEditor.getValue();
    const css = cssEditor.getValue();
    const js = jsEditor.getValue();

    const formData = new URLSearchParams();
    formData.append('html', html);
    formData.append('css', css);
    formData.append('js', js);
    formData.append('code', siteCode);

    fetch('/update_site', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
    })
    .then((response) => response.json())
    .then((data) => {
        if (data.error) {
            showMessageModal('Error', 'An error occurred while updating your ShortSite.');
        } else {
            showMessageModal('Success', `
                <p>Your ShortSite has been updated!</p>
                <p>Visit it at: <a href="/s/${siteCode}" target="_blank" class="text-blue-400 underline">/s/${siteCode}</a></p>
            `);
        }
    });
}

function showMessageModal(title, content) {
    const modal = document.getElementById('message-modal');
    const modalTitle = document.getElementById('message-title');
    const modalContent = document.getElementById('message-content');
    const mainElement = document.querySelector('main');

    modalTitle.textContent = title;
    modalTitle.style.display = title ? 'block' : 'none';
    modalContent.innerHTML = content;
    modal.style.display = 'block';
    
    mainElement.classList.add('opacity-70', 'blur-sm');
}

function hideMessageModal() {
    const modal = document.getElementById('message-modal');
    const mainElement = document.querySelector('main');
    
    modal.style.display = 'none';
    mainElement.classList.remove('opacity-70', 'blur-sm');
}

function sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    if (!message) return;

    messages.push({ role: 'user', content: message });
    input.value = '';
    addMessageToChat('user', message);
    
    const loadingId = 'loading-message-' + Date.now();
    addMessageToChat('assistant', '...', loadingId);
    
    const html = htmlEditor.getValue();
    const css = cssEditor.getValue();
    const js = jsEditor.getValue();
    
    const chatMessages = document.getElementById('chat-messages');
    const aiMessageDiv = document.createElement('div');
    aiMessageDiv.className = 'p-2 rounded bg-[#894cc6] mr-8';
    aiMessageDiv.id = 'ai-response-' + Date.now();
    
    const iconSpan = document.createElement('span');
    iconSpan.className = 'font-bold';
    iconSpan.textContent = 'AI: ';
    
    const contentSpan = document.createElement('span');
    contentSpan.id = 'ai-content-' + Date.now();
    contentSpan.textContent = '';
    
    aiMessageDiv.appendChild(iconSpan);
    aiMessageDiv.appendChild(contentSpan);
    
    document.getElementById(loadingId)?.remove();
    chatMessages.appendChild(aiMessageDiv);
    
    fetch('/ai', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            messages: messages,
            html: html,
            css: css,
            js: js
        }),
    })
    .then(response => {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullResponse = '';
        
        function processStream() {
            return reader.read().then(({ done, value }) => {
                if (done) {
                    contentSpan.innerHTML = formatAIResponse(fullResponse);
                    contentSpan.querySelectorAll('pre code').forEach((el) => {
                        hljs.highlightElement(el);
                    });
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                    
                    messages.push({ role: 'assistant', content: fullResponse });
                    return;
                }
                
                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;
                
                let lines = buffer.split('\n\n');
                buffer = lines.pop() || '';
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.substring(6));
                            if (data.content === '[DONE]') return;
                            
                            fullResponse += data.content;
                            
                            contentSpan.innerHTML = formatAIResponse(fullResponse);
                            contentSpan.querySelectorAll('pre code').forEach((el) => {
                                hljs.highlightElement(el);
                            });
                            
                            chatMessages.scrollTop = chatMessages.scrollHeight;
                        } catch (e) {
                            console.error('Error parsing SSE data:', e);
                        }
                    }
                }
                
                return processStream();
            });
        }
        
        return processStream();
    })
    .catch(error => {
        console.error('Error with AI request:', error);
        contentSpan.innerHTML += "<br>[Error: Could not connect to AI service]";
    });
}

function formatAIResponse(text) {
    if (!text) return '';

    const codeBlocks = [];
    text = text.replace(/```(\w+)?\s*([\s\S]*?)\s*```/g, function(match, language, code) {
        codeBlocks.push({
            language: language || 'plaintext',
            code: code
        });
        return `%%%CODEBLOCK${codeBlocks.length - 1}%%%`;
    });

    text = text.replace(/\n/g, '<br>');

    codeBlocks.forEach((block, index) => {
        const escapedCode = escapeHtml(block.code);
        const codeHTML = `<pre><code class="language-${block.language}">${escapedCode}</code></pre>`;
        text = text.replace(`%%%CODEBLOCK${index}%%%`, codeHTML);
    });

    text = text.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
    return text;
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function addMessageToChat(role, content, id = null) {
    const chatMessages = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `p-2 rounded ${role === 'user' ? 'bg-[#1a1a1f] ml-8' : 'bg-[#894cc6] mr-8'}`;
    if (id) messageDiv.id = id;
    
    const iconSpan = document.createElement('span');
    iconSpan.className = 'font-bold';
    iconSpan.textContent = role === 'user' ? 'You: ' : 'AI: ';
    
    const contentSpan = document.createElement('span');
    contentSpan.textContent = content;
    
    messageDiv.appendChild(iconSpan);
    messageDiv.appendChild(contentSpan);
    chatMessages.appendChild(messageDiv);
    
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Set up password functionality
document.addEventListener('DOMContentLoaded', function() {
    const setPasswordBtn = document.getElementById('set-password-btn');
    if (setPasswordBtn) {
        setPasswordBtn.addEventListener('click', function() {
            const password = document.getElementById('password-input').value;
            if (password.trim() === '') {
                showMessageModal('Error', 'Please enter an access code');
                return;
            }
            
            fetch(`/set_password/${siteCode}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `password=${encodeURIComponent(password)}`
            })
            .then(response => response.json())
            .then(data => {
                if (data.authorized) {
                    showMessageModal('Success', 'Access code set successfully!');
                    document.getElementById('password-input').value = '';
                } else {
                    showMessageModal('Error', data.message || 'Failed to set access code');
                }
            })
            .catch(error => {
                showMessageModal('Error', 'An error occurred');
                console.error('Error:', error);
            });
        });
    }
});