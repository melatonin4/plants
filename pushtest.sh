# Test basic connectivity
curl -I https://github.com

# Test Git operations with a different repo
git clone https://github.com/octocat/Hello-World.git test-repo
cd test-repo
echo "test" > test.txt
git add test.txt
git commit -m "test"
git push origin main