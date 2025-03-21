from flask import Flask, render_template, request, jsonify, session, redirect, Response
import random, string, jsmin, rcssmin, minify_html, os, json
from supabase import create_client, Client
from openai import Client
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__)
app.secret_key = os.urandom(24)

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
# tablename: shortsites, tablecolumns: id (int8) | html (text) | code (text) | javascript (text) | css (text) | password_hash (text)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

openai = Client(api_key=os.environ.get("OPENAI_API_KEY"))

def get_domain():
    return request.url_root[:-1]

def generate_code():
    alphanumeric = string.ascii_letters + string.digits
    code = ''.join(random.choices(alphanumeric, k=5))
    return code

@app.route('/')
def index():
    validated_codes = session.get('validated_codes', [])
    sites = []
    if validated_codes:
        response = supabase.table('shortsites').select('*').in_('code', validated_codes).execute()
        sites = response.data
    return render_template('index.html', sites=sites)

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

    access_key = ''.join(random.choices(string.ascii_letters + string.digits, k=8))
    
    url = f'{domain}/s/{code}'
    response = supabase.table("shortsites").insert({
        "html": html, 
        "css": css, 
        "javascript": js, 
        "code": code,
        "password_hash": access_key
    }).execute()
    print(response)
    
    session[f'edit_auth_{code}'] = True
    
    validated_codes = session.get('validated_codes', [])
    if code not in validated_codes:
        validated_codes.append(code)
        session['validated_codes'] = validated_codes
    
    return jsonify({ 'link': url, 'access_key': access_key, 'edit_link': f'{domain}/edit/{code}?code={access_key}' })

@app.route('/create')
def create():
    return render_template('create.html')

@app.route('/s/<code>')
def shortsite(code):
    try:
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
            return render_template('basesite.html', site_content=html)
        else: return render_template("site_not_found.html"), 404
    except Exception as e:
        print(f"Error rendering site: {e}")
        return render_template("site_not_found.html"), 404
    
@app.route('/ai', methods=["GET", "POST"])
def ai():
    if request.method == "POST":
        try:
            data = request.get_json()
            client_messages = data.get('messages', [])
            html_code = data.get('html', '')
            css_code = data.get('css', '')
            js_code = data.get('js', '')
            
            system_message = f"""
            You are an AI helper helping students with very basic web development knowledge.\nThe user is not familiar with writing websites and is working on a website with the following code (based on a template):
            
            HTML:
            ```html\n{html_code}\n```\n
            CSS:
            ```css\n{css_code}\n```\n
            JavaScript:
            ```javascript\n{js_code}\n```
            
            Provide helpful, very short and concise responses about web development. Always aim to explain and teach the user.\nWhen writing code for the html, always make sure to include `<style do-not-remove>[[_CSS_]]</style>` in the head of the html. and `<script do-not-remove>[[_JS_]]</script>` in the body of the html.
            """

            conversation = [{"role": "system", "content": system_message}] + client_messages
            
            response = openai.chat.completions.create(
                model="gpt-4o-mini",
                messages=conversation,
                max_tokens=1000,
                temperature=0.7,
                stream=True
            )

            total_response = [] #
            
            def generate():
                for chunk in response:
                    if chunk.choices[0].delta.content is not None:
                        total_response.append(chunk.choices[0].delta.content)
                        yield f"data: {json.dumps({'content': chunk.choices[0].delta.content})}\n\n"

                final_response = ''.join(total_response)  #
                print("\nFINAL AI RESPONSE:\n", final_response)  #
                yield f"data: {json.dumps({'content': '[DONE]'})}\n\n"
            
            return Response(generate(), mimetype='text/event-stream')
            
        except Exception as e: print(f"Error in AI processing: {e}"); return jsonify({"response": f"Sorry, there was an error: {str(e)}"}), 500
    else: return render_template("whoops.html")

@app.errorhandler(Exception)
def handle_exception(e):
    return render_template("whoops.html", error=e), getattr(e, 'code', 500)

@app.route('/edit/<code>', methods=['GET'])
def edit_site(code):
    access_code = request.args.get('code')
    
    response = supabase.table('shortsites').select('*').eq('code', code).execute()
    if len(response.data) == 0: return render_template("site_not_found.html"), 404
    
    site_data = response.data[0]
    is_authorized = session.get(f'edit_auth_{code}', False)
    
    if not is_authorized:
        if 'password_hash' in site_data and site_data['password_hash']:
            if not access_code or access_code != site_data['password_hash']: return redirect(f'/s/{code}')
            else: session[f'edit_auth_{code}'] = True

    return render_template('edit.html', html=site_data['html'], css=site_data['css'], js=site_data['javascript'], code=code)

@app.route('/update_site', methods=['POST'])
def update_site():
    code = request.form.get('code')
    html = request.form.get('html')
    css = request.form.get('css')
    js = request.form.get('js')

    if not session.get(f'edit_auth_{code}'): return jsonify({'success': False, 'message': 'Not authorized'}), 403
    supabase.table('shortsites').update({
        'html': html,
        'css': css,
        'javascript': js
    }).eq('code', code).execute()
    
    return jsonify({'success': True})

@app.route('/check_auth/<code>')
def check_auth(code):
    """Check if the user is authorized to edit this site based on session data"""
    is_authorized = session.get(f'edit_auth_{code}', False)
    return jsonify({'authorized': is_authorized})

@app.route('/verify_code/<code>', methods=['POST'])
def verify_code(code):
    data = request.get_json()
    access_code = data.get('accessCode')
    
    response = supabase.table('shortsites').select('*').eq('code', code).execute()
    if len(response.data) == 0:
        return jsonify({'success': False, 'message': 'Site not found'}), 404
    site_data = response.data[0]
    
    if site_data['password_hash'] == access_code:
        session[f'edit_auth_{code}'] = True
        validated_codes = session.get('validated_codes', [])
        if code not in validated_codes:
            validated_codes.append(code)
            session['validated_codes'] = validated_codes
        return jsonify({'success': True})
    else:
        return jsonify({'success': False, 'message': 'Invalid access code'}), 403

@app.route('/set_password/<code>', methods=['POST'])
def set_password(code):
    if not session.get(f'edit_auth_{code}'): return jsonify({'success': False, 'message': 'Not authorized'}), 403
    
    password = request.form.get('password') # hash in future
    supabase.table('shortsites').update({ 'password_hash': password }).eq('code', code).execute()
    return jsonify({'success': True})

if __name__ == '__main__':
    app.run(debug=False, port=2929, host="0.0.0.0")