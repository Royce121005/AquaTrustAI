import subprocess, os, sys

env = dict(os.environ)
env['DATABASE_URL'] = 'sqlite+aiosqlite:///./test_audit.db'
env['SECRET_KEY'] = 'audit_test_secret_key_32_chars_min_really'
env['DLT_MODE'] = 'SIMULATION'
env['JWT_ALGORITHM'] = 'HS256'
env['APP_ENV'] = 'test'

result = subprocess.run(
    [sys.executable, '-m', 'pytest',
     'tests/test_dlt_merkle.py',
     'tests/test_dlt_verification.py',
     'tests/test_dlt_gateway_batch.py',
     'tests/test_health.py',
     'tests/test_config.py',
     'tests/test_errors.py',
     'tests/test_middleware.py',
     'tests/test_logging.py',
     '-v', '--tb=short', '--ignore=tests/test_security_rbac.py'],
    cwd=r'c:\Users\valentino\Downloads\AquatrustAI\backend',
    env=env,
    capture_output=True,
    text=True,
    timeout=180
)
print(result.stdout[-10000:] if len(result.stdout) > 10000 else result.stdout)
if result.stderr:
    print("STDERR:", result.stderr[-2000:])
print(f"\nReturn code: {result.returncode}")
