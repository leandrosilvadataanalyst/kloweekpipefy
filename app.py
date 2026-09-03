from flask import Flask, render_template, jsonify, request, redirect, url_for, session
from config import Config
from controllers.dashboard_controller import DashboardController
from controllers.pipefy_controller import PipefyController

app = Flask(__name__)
app.config.from_object(Config)

@app.route('/')
def index():
    data = DashboardController.get_dashboard_data()
    return render_template('index.html', data=data)

@app.route('/roi')
def roi():
    data = DashboardController.get_roi_data()
    return render_template('roi.html', data=data)

@app.route('/api/dashboard')
def api_dashboard():
    pipe_id = request.args.get('pipe_id')
    data = DashboardController.get_dashboard_data(pipe_id)
    return jsonify(data)

@app.route('/api/roi')
def api_roi():
    pipe_id = request.args.get('pipe_id')
    data = DashboardController.get_roi_data(pipe_id)
    return jsonify(data)

@app.route('/login')
def login():
    if not PipefyController.is_authenticated():
        auth_url = PipefyController.get_auth_url()
        return redirect(auth_url)
    return redirect(url_for('index'))

@app.route('/callback')
def callback():
    code = request.args.get('code')
    if code:
        success = PipefyController.handle_callback(code)
        if success:
            return redirect(url_for('index'))
    return redirect(url_for('login'))

@app.route('/logout')
def logout():
    PipefyController.logout()
    return redirect(url_for('index'))

if __name__ == '__main__':
    app.run(debug=True)
