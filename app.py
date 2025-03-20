from flask import Flask, render_template, request, jsonify, render_template_string
import random, string, jsmin, rcssmin, minify_html
from supabase import create_client, Client

app = Flask(__name__)

SUPABASE_URL = "https://ddxiypgmfhcchnmeldfi.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkeGl5cGdtZmhjY2hubWVsZGZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzMzNDg1MzMsImV4cCI6MjA0ODkyNDUzM30.Wd6-6JsYRUc6fugAP_-7AHD4BqyXOBJ2cl5XgHrKrwg"
# tablename: shortsites, tablecolumns: id (int8) | html (text) | code (text) | javascript (text) | css (text) | password_hash (text)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_domain():
    return request.url_root[:-1]

def generate_code():
    alphanumeric = string.ascii_letters + string.digits
    code = ''.join(random.choices(alphanumeric, k=5))
    return code

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/uploadsite', methods=['POST'])
def uploadsite():
    print(request.form)
    css = request.form['css']
    html = request.form['html']
    js = request.form['js']

    domain = get_domain()
    code = generate_code()

    checkifcodexists = supabase.table('shortsites').select('*').eq('code', code).execute()
    if len(checkifcodexists.data) > 0: code = generate_code()

    url = f'{domain}/s/{code}'
    response = supabase.table("shortsites").insert({"html": html, "css": css, "javascript": js, "code": code}).execute()
    print(response)

    return jsonify({ 'link': url })

@app.route('/create')
def create():
    return render_template('create.html')

@app.route('/s/<code>')
def shortsite(code):
    try:
        # get the html, css and js from the database using the code
        # then merge them into an html page and return render_template_string(merged_html_page)
        response = supabase.table('shortsites').select('*').eq('code', code).execute()
        if len(response.data) > 0:
            html = response.data[0]['html']
            css = response.data[0]['css']
            js = response.data[0]['javascript']
            html = minify_html.minify(html, minify_js=True, minify_css=True)
            css = rcssmin.cssmin(css)
            js = jsmin.jsmin(js)
            html = html.replace('[[_CSS_]]', css)
            html = html.replace('[[_JS_]]', js)
            return render_template_string(html)
    except:
        return render_template("site_not_found.html"), 404
    
@app.route('/ai', methods=["GET", "POST"])
def ai():
    if request.method == "POST": print("hi")
    else: return render_template("whoops.html")

@app.errorhandler(Exception)
def handle_exception(e):
    return render_template("whoops.html", error=e), getattr(e, 'code', 500)

if __name__ == '__main__':
    app.run(debug=True, port=2929)