
# Update locale
echo "Build locale"
cd ./locale
./update.sh
cd ..

# Compile schema
echo "Build schema"
glib-compile-schemas ./schemas/

# Zip
echo "Zip"
zip -r todolist@bsaleil.org.zip . -x *.git*

echo "Done."