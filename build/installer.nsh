; A fresh per-user installation shares the same root as portable migration.
; Explicit updater /D and registered existing installations keep their paths.
!macro customInit
  !insertmacro GetDParameter $R0
  ${If} $R0 == ""
    ${If} $perUserInstallationFolder == ""
    ${AndIf} $installMode == "CurrentUser"
      StrCpy $INSTDIR "$LOCALAPPDATA\KeyboardCat\app"
    ${EndIf}
  ${EndIf}
!macroend
