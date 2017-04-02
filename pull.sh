#!/bin/sh

if [ -z "$GOPATH" ]; then
    echo "Need to set GOPATH"
    exit 1
fi

if [[ -d "peerbackend" ]]; then
    read -p "Peerbackend already exists. Delete and re-pull code? [y/n]" -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
	rm -rf peerbackend
    else
	exit
    fi	
fi

# Folder Variables
WS=`pwd`
GOTMP=$GOPATH/src/tmp/peerbackend

echo "------------------------------------------------------------"
echo "Pull code from Github"
echo "------------------------------------------------------------"

if ! git clone --depth 1 https://github.com/turbotardigrade/agora.git $GOTMP; then
    echo "Could not clone project"
    exit
fi

echo "------------------------------------------------------------"
echo "Install dependencies"
echo "------------------------------------------------------------"
cd $GOTMP
go get
gx install

echo "------------------------------------------------------------"
echo "Build Peerbackend"
echo "------------------------------------------------------------"
mv $GOTMP $WS
cd $WS/peerbackend

if ./travis_install.sh && go build ; then
    echo "Build succeeded"
else
    echo "Build failed"
fi
