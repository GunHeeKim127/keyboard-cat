#!/bin/sh
# Called only on the local WSL host. Password arrives on stdin, never argv.
set -eu
umask 077
input=$1
tool=$2
p12=$3
output=$4
expected_tool_hash=$5
expected_input_hash=$6
test "$(sha256sum "$tool" | cut -d ' ' -f 1)" = "$expected_tool_hash"
test "$(sha256sum "$input" | cut -d ' ' -f 1)" = "$expected_input_hash"
test ! -e "$output"
job=$(mktemp -d /tmp/keyboard-cat-local-signing-XXXXXXXX)
cleanup() {
  unset RCODESIGN_SIGN_SIGNER_P12_PASSWORD
  case "$job" in /tmp/keyboard-cat-local-signing-*) rm -rf -- "$job" ;; *) exit 1 ;; esac
}
trap cleanup EXIT HUP INT TERM
mkdir -p "$job/input" "$job/output" "$job/keys" "$job/lib" "$job/usr/bin" "$job/usr/lib"
unzip -q "$input" -d "$job/input"
test -d "$job/input/Keyboard Cat.app"
cp "$tool" "$job/rcodesign"
cp /usr/bin/setpriv "$job/usr/bin/setpriv"
cp -L /lib/ld-musl-x86_64.so.1 "$job/lib/ld-musl-x86_64.so.1"
cp -L /usr/lib/libcap-ng.so.0 "$job/usr/lib/libcap-ng.so.0"
cp "$p12" "$job/keys/identity.p12"
cat > "$job/sign.toml" <<'EOF'
[default.sign.signer.p12]
path = "/keys/identity.p12"
EOF
chmod 755 "$job" "$job/rcodesign" "$job/keys" "$job/usr" "$job/usr/bin" "$job/usr/lib" "$job/lib"
chmod 755 "$job/input" "$job/usr/bin/setpriv" "$job/lib/ld-musl-x86_64.so.1"
chmod 644 "$job/usr/lib/libcap-ng.so.0"
chmod -R a+rX "$job/input/Keyboard Cat.app"
chmod 444 "$job/keys/identity.p12" "$job/sign.toml"
chown 65534:65534 "$job/output"
IFS= read -r RCODESIGN_SIGN_SIGNER_P12_PASSWORD
test -n "$RCODESIGN_SIGN_SIGNER_P12_PASSWORD"
export RCODESIGN_SIGN_SIGNER_P12_PASSWORD
# Separate network namespace, restricted root, no Linux capabilities, no privileges.
if ! timeout 600 unshare -n chroot "$job" /usr/bin/setpriv --reuid=65534 --regid=65534 --clear-groups --bounding-set=-all --inh-caps=-all --ambient-caps=-all --no-new-privs /rcodesign -C /sign.toml sign --timestamp-url none "/input/Keyboard Cat.app" "/output/Keyboard Cat.app" >"$job/signing.log" 2>&1; then
  echo 'LOCAL_MAC_SIGNING_FAILED' >&2
  # Virtual-root paths only; do not export arbitrary tool logs or secrets.
  exit 1
fi
unset RCODESIGN_SIGN_SIGNER_P12_PASSWORD
tar -czf "$output" -C "$job/output" 'Keyboard Cat.app'
echo "LOCAL_MAC_SIGNING_OK $(sha256sum "$output" | cut -d ' ' -f 1)"
