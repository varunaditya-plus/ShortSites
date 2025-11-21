"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Save, Plus, Copy, Share2 } from "lucide-react"

export default function Editor() {
  const [accessCode, setAccessCode] = useState("")
  const [activeTab, setActiveTab] = useState("html")

  return (
    <div className="flex flex-col h-screen bg-background text-foreground dark">
      {/* Main Content */}
      <main className="flex flex-col flex-1 overflow-hidden">
        {/* Editor Panel */}
        <div className="flex-1 flex flex-col overflow-hidden p-4 border-b border-border">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 overflow-hidden">
            <div className="pt-0">
              <TabsList className="grid w-fit grid-cols-3 gap-2">
                <TabsTrigger value="html" className="gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-4 h-4">
                    <path
                      fill="currentColor"
                      d="m4 4 2 22 10 2 10-2 2-22Zm19.72 7H11.28l.29 3h11.86l-.802 9.335L15.99 25l-6.635-1.646L8.93 19h3.02l.19 2 3.86.77 3.84-.77.29-4H8.84L8 8h16Z"
                    ></path>
                  </svg>
                  HTML
                </TabsTrigger>
                <TabsTrigger value="css" className="gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-4 h-4">
                    <path
                      fill="currentColor"
                      d="m29.18 4-3.57 18.36-.33 1.64-4.74 1.57-3.28 1.09L13.21 28 2.87 24.05 4.05 18h4.2l-.44 2.85 6.34 2.42.78-.26 6.52-2.16.17-.83.79-4.02H4.44l.74-3.76.05-.24h17.96l.78-4H6l.78-4h22.4z"
                    ></path>
                  </svg>
                  CSS
                </TabsTrigger>
                <TabsTrigger value="js" className="gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-4 h-4">
                    <path
                      fill="currentColor"
                      d="M29.18 4-3.57 18.36-.33 1.64-4.74 1.57-3.28 1.09L13.21 28 2.87 24.05 4.05 18h4.2l-.44 2.85 6.34 2.42.78-.26 6.52-2.16.17-.83.79-4.02H4.44l.74-3.76.05-.24h17.96l.78-4H6l.78-4h22.4z"
                    ></path>
                  </svg>
                  JavaScript
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Code Editor Area */}
            <TabsContent value="html" className="flex-1 overflow-hidden">
              <textarea
                className="w-full h-full p-4 font-mono text-sm bg-muted border-0 focus:outline-none resize-none"
                placeholder="Enter your HTML code here..."
                defaultValue={`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Website</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <h1>Welcome to My Website</h1>
  <p>Start editing to see your changes!</p>
  <script src="script.js"><\/script>
</body>
</html>`}
              ></textarea>
            </TabsContent>

            <TabsContent value="css" className="flex-1 overflow-hidden">
              <textarea
                className="w-full h-full p-4 font-mono text-sm bg-muted border-0 focus:outline-none resize-none"
                placeholder="Enter your CSS code here..."
                defaultValue={`body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  margin: 0;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
}

h1 {
  color: white;
  text-align: center;
}

p {
  color: rgba(255, 255, 255, 0.9);
  text-align: center;
}`}
              ></textarea>
            </TabsContent>

            <TabsContent value="js" className="flex-1 overflow-hidden">
              <textarea
                className="w-full h-full p-4 font-mono text-sm bg-muted border-0 focus:outline-none resize-none"
                placeholder="Enter your JavaScript code here..."
                defaultValue={`// Add your JavaScript code here
console.log('Web Builder is ready!');

document.addEventListener('DOMContentLoaded', () => {
  const h1 = document.querySelector('h1');
  if (h1) {
    h1.addEventListener('click', () => {
      h1.style.color = '#' + Math.floor(Math.random()*16777215).toString(16);
    });
  }
});`}
              ></textarea>
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden p-4">
          <div className="flex-1 overflow-hidden">
            <iframe
              title="Live Preview"
              className="w-full h-full border border-border rounded-lg shadow-sm bg-white"
              sandbox="allow-scripts"
            ></iframe>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-2">
            <Button className="gap-2">
              <Save className="w-4 h-4" />
              Save
            </Button>
            <Button variant="outline" className="gap-2 bg-transparent">
              <Plus className="w-4 h-4" />
              New File
            </Button>
          </div>

          <div className="flex items-center gap-3 flex-1 max-w-xs ml-auto">
            <Input
              type="text"
              placeholder="Set access code"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              className="h-9"
            />
            <Button variant="secondary" size="sm" className="gap-2">
              <Share2 className="w-4 h-4" />
              Share
            </Button>
          </div>

          <Button variant="ghost" size="sm" className="gap-2">
            <Copy className="w-4 h-4" />
            Export
          </Button>
        </div>
      </footer>
    </div>
  )
}
