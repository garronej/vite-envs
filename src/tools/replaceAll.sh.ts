export const replaceAllShDeclaration = `
replaceAll() {
  local inputString="$1"
  local pattern="$2"
  local replacement="$3"

  # Initialize the string variable
  local str=""
  local processedString=""

  # Split inputString into lines
  IFS='
'
  set -f
  for line in $inputString; do
    # Reset IFS to default for processing characters
    unset IFS
    set +f
    # Append newline to each line except the first
    if [ -n "$str" ]; then
      str="\${str}
"
    fi

    # Iterate through each character in the line
    local lineLength=\${#line}
    for ((i=0; i<lineLength; i++)); do
      local char="\${line:$i:1}"
      str="$str$char"

      # Check if the current string ends with the pattern
      local patternLength=\${#pattern}
      if [ "\${str: -$patternLength}" = "$pattern" ]; then
        # Remove the pattern from the string
        str="\${str%$pattern}"
        # Append the replacement to the string
        str="\${str}\${replacement}"
      fi
    done
    # Set IFS for line splitting
    IFS='
'
    set -f
  done
  # Reset IFS to default and unset 'f' option
  unset IFS
  set +f

  # Echo the processed string
  echo "$str"
}
`;
